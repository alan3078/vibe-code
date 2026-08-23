import { ConflictException, Inject, Injectable, NotFoundException, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { AuditActorType, AuditOutcome } from '../entities/audit-log.entity';
import { Project, ProjectStatus } from '../entities/project.entity';
import { Template } from '../entities/template.entity';
import { User } from '../entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { WORKSPACE_PROVIDER, WorkspaceProvider } from '../workspace/workspace-provider';
import { AuditService } from '../audit/audit.service';
import { PlatformConfigurationService } from '../configuration/platform-configuration.service';

const GOLDEN_TEMPLATE_ID = 'golden-react-nest-postgres';

@Injectable()
export class ProjectsService implements OnApplicationBootstrap {
  private readonly ownerCreateTails = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Template) private readonly templateRepository: Repository<Template>,
    @Inject(WORKSPACE_PROVIDER) private readonly workspaceService: WorkspaceProvider,
    @Optional() private readonly configurationService?: PlatformConfigurationService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  onApplicationBootstrap(): void {
    void this.recoverPendingLifecycles();
  }

  /** Requeues durable transition rows after a control-plane restart. */
  async recoverPendingLifecycles(): Promise<void> {
    const pending = await this.projectRepository.find({
      where: { status: In([ProjectStatus.Creating, ProjectStatus.Starting, ProjectStatus.Stopping, ProjectStatus.Deleting]), deletedAt: IsNull() },
      relations: { owner: true, template: true },
    });
    for (const project of pending) {
      if (project.status === ProjectStatus.Creating) void this.provisionWorkspace(project.id);
      if (project.status === ProjectStatus.Starting) void this.startWorkspace(project.id);
      if (project.status === ProjectStatus.Stopping) void this.stopWorkspace(project.id);
      if (project.status === ProjectStatus.Deleting) void this.deleteWorkspace(project.id);
    }
  }

  async listForOwner(ownerId: string, requestId: string | null = null): Promise<Project[]> {
    const projects = await this.projectRepository.find({
      where: { owner: { id: ownerId }, deletedAt: IsNull() },
      relations: { owner: true, template: true },
      order: { updatedAt: 'DESC' },
    });
    await Promise.all(projects.map(async (project) => {
      if (!project.workspaceId) return;
      const expectedStatus = project.status;
      await this.refreshFromProvider(project, requestId);
      await this.persistObservedProject(project, expectedStatus);
    }));
    return projects;
  }

  async getForOwner(ownerId: string, projectId: string, requestId: string | null = null): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, owner: { id: ownerId }, deletedAt: IsNull() },
      relations: { owner: true, template: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const expectedStatus = project.status;
    if (this.isLocalWorkspace(project.workspaceId)) {
      this.normalizeLocalPreviewUrls(project);
      await this.refreshFromProvider(project, requestId);
    } else if (project.workspaceId) {
      await this.refreshFromProvider(project, requestId);
    }
    project.lastOpenedAt = new Date();
    project.lastActivityAt = project.lastOpenedAt;
    await this.persistObservedProject(project, expectedStatus);
    return (await this.findProjectForLifecycle(project.id)) || project;
  }

  async create(ownerId: string, dto: CreateProjectDto, idempotencyKey?: string, requestId: string | null = null): Promise<Project> {
    return this.withOwnerCreateLock(ownerId, () => this.createLocked(ownerId, dto, idempotencyKey, requestId));
  }

  private async createLocked(ownerId: string, dto: CreateProjectDto, idempotencyKey?: string, requestId: string | null = null): Promise<Project> {
    if (idempotencyKey) {
      const existing = await this.projectRepository.findOne({
        where: { owner: { id: ownerId }, idempotencyKey },
        relations: { owner: true, template: true },
      });
      if (existing) {
        return existing;
      }
    }

    const owner = await this.userRepository.findOneBy({ id: ownerId });
    if (!owner) {
      throw new NotFoundException('User not found');
    }
    const template = await this.templateRepository.findOneBy({ id: GOLDEN_TEMPLATE_ID, isActive: true });
    if (!template) {
      throw new NotFoundException('Golden template is not available');
    }
    const duplicate = await this.projectRepository.findOne({ where: { owner: { id: ownerId }, name: dto.name, deletedAt: IsNull() } });
    if (duplicate) {
      throw new ConflictException('You already have a project with this name');
    }

    await this.assertActiveWorkspaceCapacity(ownerId);
    const now = new Date();
    const project = this.projectRepository.create({
      owner,
      template,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      status: ProjectStatus.Creating,
      workspaceId: `local-workspace-${Date.now()}`,
      workspaceUrl: null,
      frontendPreviewUrl: 'http://localhost:5173/preview',
      apiPreviewUrl: 'http://localhost:3000/api/preview',
      sourceRepository: null,
      currentCommit: null,
      lastKnownError: null,
      idempotencyKey: idempotencyKey || null,
      lastOpenedAt: null,
      lastActivityAt: now,
      provisioningStartedAt: now,
      provisionedAt: null,
      stoppedAt: null,
      statusChangedAt: now,
      deletedAt: null,
    });
    let creating: Project;
    try {
      creating = await this.projectRepository.save(project);
    } catch (error) {
      if (idempotencyKey && this.isUniqueViolation(error)) {
        const concurrent = await this.projectRepository.findOne({
          where: { owner: { id: ownerId }, idempotencyKey },
          relations: { owner: true, template: true },
        });
        if (concurrent) return concurrent;
      }
      throw error;
    }
    void this.provisionWorkspace(creating.id, requestId);
    return creating;
  }

  private async provisionWorkspace(projectId: string, requestId: string | null = null): Promise<void> {
    let workspaceId: string | null = null;
    try {
      const creating = await this.findProjectForLifecycle(projectId);
      if (!creating || creating.status !== ProjectStatus.Creating) return;
      const workspace = await this.workspaceService.provision(creating.id, creating.name, creating.owner?.coderUsername || undefined);
      workspaceId = workspace.workspaceId;
      const persisted = await this.findProjectForLifecycle(projectId);
      if (!persisted || persisted.status === ProjectStatus.Deleted) {
        await this.workspaceService.delete(workspace.workspaceId);
        return;
      }
      const attached = await this.compareAndSet(projectId, [ProjectStatus.Creating], {
        workspaceId: workspace.workspaceId,
        workspaceUrl: workspace.workspaceUrl || `http://localhost:5173/workspaces/${persisted.id}`,
        frontendPreviewUrl: workspace.frontendPreviewUrl || `http://localhost:5173/preview/${persisted.id}`,
        apiPreviewUrl: workspace.apiPreviewUrl || `http://localhost:3000/api/preview/projects/${persisted.id}/requests`,
        sourceRepository: workspace.sourceRepository,
      });
      if (!attached) {
        await this.workspaceService.delete(workspace.workspaceId);
        const deletedAt = new Date();
        await this.compareAndSet(projectId, [ProjectStatus.Deleting], { status: ProjectStatus.Deleted, deletedAt, statusChangedAt: deletedAt, workspaceUrl: null, frontendPreviewUrl: '', apiPreviewUrl: '' });
        return;
      }
      if (persisted.status === ProjectStatus.Deleting) {
        void this.deleteWorkspace(projectId, requestId);
        return;
      }
      if (persisted.status === ProjectStatus.Stopping) { void this.stopWorkspace(projectId, requestId); return; }
      const reflected = creating.owner?.coderUsername
        ? await this.workspaceService.describe(workspace.workspaceId, creating.owner.coderUsername)
        : await this.workspaceService.describe(workspace.workspaceId);
      const ready = await this.findProjectForLifecycle(projectId);
      if (!ready || ready.status === ProjectStatus.Deleted) return;
      if (ready.status === ProjectStatus.Deleting) { void this.deleteWorkspace(projectId, requestId); return; }
      if (ready.status === ProjectStatus.Stopping) { void this.stopWorkspace(projectId, requestId); return; }
      if (ready.status !== ProjectStatus.Creating) return;
      const observed = reflected.lifecycleStatus ? (reflected.lifecycleStatus as ProjectStatus) : ProjectStatus.Creating;
      const transitioned = await this.compareAndSet(projectId, [ProjectStatus.Creating], { currentCommit: reflected.currentCommit || workspace.currentCommit, status: observed, provisionedAt: observed === ProjectStatus.Running ? new Date() : ready.provisionedAt, statusChangedAt: new Date() });
      if (!transitioned) { void this.deleteWorkspace(projectId, requestId); return; }
      if (this.auditService) await this.auditService.recordCompletion({ actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_PROVISIONED', resourceType: 'Project', resourceId: ready.id, projectId: ready.id, outcome: AuditOutcome.Success, requestId, metadata: { workspaceId: ready.workspaceId, status: observed } });
    } catch (error) {
      const failed = await this.findProjectForLifecycle(projectId);
      if (!failed || failed.status === ProjectStatus.Deleting || failed.status === ProjectStatus.Deleted) {
        if (workspaceId) await this.workspaceService.delete(workspaceId).catch(() => undefined);
        return;
      }
      if (process.env.WORKSPACE_PROVIDER === 'coder' && !workspaceId) {
        await this.compareAndSet(projectId, [ProjectStatus.Creating], { lastKnownError: this.safeError(error), statusChangedAt: new Date() });
        if (this.auditService) await this.auditService.recordCompletion({ actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_PROVISION_RECONCILIATION_QUEUED', resourceType: 'Project', resourceId: failed.id, projectId: failed.id, outcome: AuditOutcome.Failure, requestId, metadata: { code: 'PROVISION_RESPONSE_AMBIGUOUS' } });
        setTimeout(() => void this.provisionWorkspace(projectId, requestId), 5_000).unref();
        return;
      }
      await this.compareAndSet(projectId, [ProjectStatus.Creating], { status: ProjectStatus.Failed, lastKnownError: this.safeError(error), statusChangedAt: new Date() });
      if (this.auditService) await this.auditService.recordCompletion({ actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_PROVISION_FAILED', resourceType: 'Project', resourceId: failed.id, projectId: failed.id, outcome: AuditOutcome.Failure, requestId, metadata: { code: 'PROVISION_FAILED' } });
    }
  }

  async setLifecycle(ownerId: string, projectId: string, status: ProjectStatus, requestId: string | null = null): Promise<Project> {
    return this.withOwnerCreateLock(ownerId, () => this.setLifecycleLocked(ownerId, projectId, status, requestId));
  }

  private async setLifecycleLocked(ownerId: string, projectId: string, status: ProjectStatus, requestId: string | null = null): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, owner: { id: ownerId } },
      relations: { owner: true, template: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (status === ProjectStatus.Running) {
      if (project.status === ProjectStatus.Running || project.status === ProjectStatus.Starting) return project;
      await this.assertActiveWorkspaceCapacity(ownerId);
      const nextStatus = project.status === ProjectStatus.Failed && !project.provisionedAt ? ProjectStatus.Creating : ProjectStatus.Starting;
      const changed = await this.compareAndSet(project.id, [project.status], { status: nextStatus, lastKnownError: null, statusChangedAt: new Date(), lastActivityAt: new Date() });
      if (!changed) throw new ConflictException('Project lifecycle changed; retry the request');
      const queued = await this.findProjectForLifecycle(project.id) as Project;
      if (queued.status === ProjectStatus.Creating) void this.provisionWorkspace(queued.id, requestId);
      else void this.startWorkspace(queued.id, requestId);
      return queued;
    }
    if (status === ProjectStatus.Stopped) {
      if (project.status === ProjectStatus.Stopped || project.status === ProjectStatus.Stopping) return project;
      const changed = await this.compareAndSet(project.id, [project.status], { status: ProjectStatus.Stopping, statusChangedAt: new Date() });
      if (!changed) throw new ConflictException('Project lifecycle changed; retry the request');
      const queued = await this.findProjectForLifecycle(project.id) as Project;
      void this.stopWorkspace(queued.id, requestId);
      return queued;
    }
    throw new ConflictException('Unsupported lifecycle transition');
  }

  async deleteForOwner(ownerId: string, projectId: string, requestId: string | null = null): Promise<Project> {
    return this.withOwnerCreateLock(ownerId, () => this.deleteForOwnerLocked(ownerId, projectId, requestId));
  }

  private async deleteForOwnerLocked(ownerId: string, projectId: string, requestId: string | null): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id: projectId, owner: { id: ownerId }, deletedAt: IsNull() }, relations: { owner: true, template: true } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status === ProjectStatus.Deleting || project.status === ProjectStatus.Deleted) return project;
    const provisioning = project.status === ProjectStatus.Creating && !project.provisionedAt;
    const changed = await this.compareAndSet(project.id, [project.status], { status: ProjectStatus.Deleting, statusChangedAt: new Date() });
    if (!changed) throw new ConflictException('Project lifecycle changed; retry the request');
    const queued = await this.findProjectForLifecycle(project.id) as Project;
    if (!provisioning) void this.deleteWorkspace(queued.id, requestId);
    return queued;
  }

  async setLifecycleForAdministrator(projectId: string, status: ProjectStatus, requestId: string | null = null): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id: projectId, deletedAt: IsNull() }, relations: { owner: true } });
    if (!project) throw new NotFoundException('Project not found');
    return this.setLifecycle(project.owner.id, projectId, status, requestId);
  }

  async deleteForAdministrator(projectId: string, requestId: string | null = null): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id: projectId, deletedAt: IsNull() }, relations: { owner: true } });
    if (!project) throw new NotFoundException('Project not found');
    return this.deleteForOwner(project.owner.id, projectId, requestId);
  }

  async markActivity(ownerId: string, projectId: string): Promise<void> {
    const project = await this.projectRepository.findOne({ where: { id: projectId, owner: { id: ownerId }, deletedAt: IsNull() } });
    if (!project) throw new NotFoundException('Project not found');
    project.lastActivityAt = new Date();
    await this.projectRepository.save(project);
  }

  private async refreshFromProvider(project: Project, requestId: string | null = null): Promise<void> {
    try {
      const workspace = project.owner?.coderUsername
        ? await this.workspaceService.describe(project.workspaceId, project.owner.coderUsername)
        : await this.workspaceService.describe(project.workspaceId);
      if (workspace.lifecycleStatus) this.applyObservedLifecycle(project, workspace.lifecycleStatus as ProjectStatus);
      project.currentCommit = workspace.currentCommit || project.currentCommit;
      project.lastKnownError = workspace.lifecycleStatus === ProjectStatus.Failed
        ? (project.lastKnownError || 'Workspace reported a failed lifecycle')
        : null;
    } catch (error) {
      project.lastKnownError = this.safeError(error);
      console.error(`[workspace-status] project=${project.id} ${project.lastKnownError}`);
      if (this.auditService) await this.auditService.recordCompletion({ actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_PROVIDER_REFRESH_FAILED', resourceType: 'Project', resourceId: project.id, projectId: project.id, outcome: AuditOutcome.Failure, requestId, metadata: { code: 'PROVIDER_REFRESH_FAILED' } });
    }
  }

  private async startWorkspace(projectId: string, requestId: string | null = null): Promise<void> {
    try {
      const project = await this.findProjectForLifecycle(projectId);
      if (!project || project.status !== ProjectStatus.Starting) return;
      await this.workspaceService.start(project.workspaceId);
      const persisted = await this.findProjectForLifecycle(projectId);
      if (!persisted || persisted.status === ProjectStatus.Deleted) return;
      if (persisted.status === ProjectStatus.Deleting) { void this.deleteWorkspace(projectId, requestId); return; }
      if (persisted.status !== ProjectStatus.Starting) return;
      await this.refreshFromProvider(persisted, requestId);
      if ((persisted.status as ProjectStatus) === ProjectStatus.Running) persisted.provisionedAt = persisted.provisionedAt || new Date();
      await this.compareAndSet(projectId, [ProjectStatus.Starting], { status: persisted.status, provisionedAt: (persisted.status as ProjectStatus) === ProjectStatus.Running ? (persisted.provisionedAt || new Date()) : persisted.provisionedAt, statusChangedAt: new Date(), currentCommit: persisted.currentCommit, lastKnownError: persisted.lastKnownError });
      if (this.auditService) await this.auditService.recordCompletion({ actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_STARTED', resourceType: 'Project', resourceId: persisted.id, projectId: persisted.id, outcome: AuditOutcome.Success, requestId, metadata: { workspaceId: persisted.workspaceId, status: persisted.status } });
    } catch (error) {
      const failed = await this.findProjectForLifecycle(projectId);
      if (!failed || failed.status === ProjectStatus.Deleting || failed.status === ProjectStatus.Deleted) return;
      await this.compareAndSet(projectId, [ProjectStatus.Starting], { status: ProjectStatus.Failed, statusChangedAt: new Date(), lastKnownError: this.safeError(error) });
      if (this.auditService) await this.auditService.recordCompletion({ actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_START_FAILED', resourceType: 'Project', resourceId: failed.id, projectId: failed.id, outcome: AuditOutcome.Failure, requestId, metadata: { code: 'START_FAILED' } });
    }
  }

  private async stopWorkspace(projectId: string, requestId: string | null = null): Promise<void> {
    try {
      const project = await this.findProjectForLifecycle(projectId);
      if (!project || project.status !== ProjectStatus.Stopping) return;
      await this.workspaceService.stop(project.workspaceId);
      const persisted = await this.findProjectForLifecycle(projectId);
      if (!persisted || persisted.status === ProjectStatus.Deleted) return;
      if (persisted.status === ProjectStatus.Deleting) { void this.deleteWorkspace(projectId, requestId); return; }
      if (persisted.status !== ProjectStatus.Stopping) return;
      const stoppedAt = new Date();
      await this.compareAndSet(projectId, [ProjectStatus.Stopping], { status: ProjectStatus.Stopped, stoppedAt, statusChangedAt: stoppedAt });
      if (this.auditService) await this.auditService.recordCompletion({ actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_STOPPED', resourceType: 'Project', resourceId: persisted.id, projectId: persisted.id, outcome: AuditOutcome.Success, requestId, metadata: { workspaceId: persisted.workspaceId } });
    } catch (error) {
      const failed = await this.findProjectForLifecycle(projectId);
      if (!failed || failed.status === ProjectStatus.Deleting || failed.status === ProjectStatus.Deleted) return;
      await this.compareAndSet(projectId, [ProjectStatus.Stopping], { status: ProjectStatus.Failed, statusChangedAt: new Date(), lastKnownError: this.safeError(error) });
      if (this.auditService) await this.auditService.recordCompletion({ actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_STOP_FAILED', resourceType: 'Project', resourceId: failed.id, projectId: failed.id, outcome: AuditOutcome.Failure, requestId, metadata: { code: 'STOP_FAILED' } });
    }
  }

  private async deleteWorkspace(projectId: string, requestId: string | null = null): Promise<void> {
    try {
      const project = await this.findProjectForLifecycle(projectId);
      if (!project || project.status !== ProjectStatus.Deleting) return;
      await this.workspaceService.delete(project.workspaceId);
      const persisted = await this.findProjectForLifecycle(projectId);
      if (!persisted || persisted.status !== ProjectStatus.Deleting) return;
      const deletedAt = new Date();
      await this.compareAndSet(projectId, [ProjectStatus.Deleting], { status: ProjectStatus.Deleted, deletedAt, statusChangedAt: deletedAt, workspaceUrl: null, frontendPreviewUrl: '', apiPreviewUrl: '' });
      if (this.auditService) await this.auditService.recordCompletion({ actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_DELETED', resourceType: 'Project', resourceId: persisted.id, projectId: persisted.id, outcome: AuditOutcome.Success, requestId, metadata: { workspaceId: persisted.workspaceId } });
    } catch (error) {
      const failed = await this.findProjectForLifecycle(projectId);
      if (!failed || failed.status === ProjectStatus.Deleted) return;
      await this.compareAndSet(projectId, [ProjectStatus.Deleting], { status: ProjectStatus.Failed, statusChangedAt: new Date(), lastKnownError: this.safeError(error) });
      if (this.auditService) await this.auditService.recordCompletion({ actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_DELETE_FAILED', resourceType: 'Project', resourceId: failed.id, projectId: failed.id, outcome: AuditOutcome.Failure, requestId, metadata: { code: 'DELETE_FAILED' } });
    }
  }

  private async assertActiveWorkspaceCapacity(ownerId: string): Promise<void> {
    if (!this.configurationService) return;
    const limit = await this.configurationService.getPositiveInteger('workspace.max_active_per_user');
    const active = await this.projectRepository.count({
      where: { owner: { id: ownerId }, status: In([ProjectStatus.Creating, ProjectStatus.Starting, ProjectStatus.Running, ProjectStatus.Stopping]), deletedAt: IsNull() },
    });
    if (active >= limit) throw new ConflictException(`You have reached the maximum of ${limit} active workspace${limit === 1 ? '' : 's'}. Stop or delete one before continuing.`);
  }

  private async withOwnerCreateLock<T>(ownerId: string, action: () => Promise<T>): Promise<T> {
    const manager = this.projectRepository.manager;
    if (manager?.connection?.options.type === 'postgres') {
      return manager.transaction(async (transactionalManager) => {
        await transactionalManager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [ownerId]);
        return action();
      });
    }
    const previous = this.ownerCreateTails.get(ownerId) || Promise.resolve();
    let unlock: (() => void) | undefined;
    const current = new Promise<void>((resolve) => { unlock = resolve; });
    this.ownerCreateTails.set(ownerId, current);
    await previous;
    try {
      return await action();
    } finally {
      unlock?.();
      if (this.ownerCreateTails.get(ownerId) === current) this.ownerCreateTails.delete(ownerId);
    }
  }

  private applyObservedLifecycle(project: Project, observed: ProjectStatus): void {
    if (project.status === ProjectStatus.Deleting || project.status === ProjectStatus.Deleted) return;
    if (project.status === ProjectStatus.Starting) {
      if (observed === ProjectStatus.Running || observed === ProjectStatus.Failed) project.status = observed;
      return;
    }
    if (project.status === ProjectStatus.Stopping) {
      if (observed === ProjectStatus.Stopped || observed === ProjectStatus.Failed) project.status = observed;
      return;
    }
    project.status = observed;
  }

  private findProjectForLifecycle(projectId: string): Promise<Project | null> {
    return this.projectRepository.findOne({ where: { id: projectId }, relations: { owner: true, template: true } });
  }

  /** Atomically updates a lifecycle row only while it is in an expected state. */
  private async compareAndSet(projectId: string, expected: ProjectStatus[], patch: Partial<Project>): Promise<boolean> {
    if (typeof this.projectRepository.update === 'function') {
      const result = await this.projectRepository.update({ id: projectId, status: In(expected) }, patch);
      return Boolean(result.affected);
    }
    // Unit-test repositories do not implement TypeORM's conditional update API.
    const current = await this.findProjectForLifecycle(projectId);
    if (!current || !expected.includes(current.status)) return false;
    Object.assign(current, patch);
    await this.projectRepository.save(current);
    return true;
  }

  private async persistObservedProject(project: Project, expectedStatus: ProjectStatus): Promise<void> {
    await this.compareAndSet(project.id, [expectedStatus], {
      status: project.status,
      currentCommit: project.currentCommit,
      lastKnownError: project.lastKnownError,
      lastOpenedAt: project.lastOpenedAt,
      lastActivityAt: project.lastActivityAt,
    });
  }

  private safeError(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Workspace operation failed';
    return `Workspace operation failed (request ${randomUUID()})${message ? ': contact an administrator for diagnostics.' : ''}`;
  }

  private correlatedError(message: string): string {
    return `${message} (request ${randomUUID()})`;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: unknown; driverError?: { code?: unknown } };
    return candidate.code === '23505' || candidate.driverError?.code === '23505';
  }

  private isLocalWorkspace(workspaceId: string | null): boolean {
    return Boolean(workspaceId?.startsWith('local-'));
  }

  private normalizeLocalPreviewUrls(project: Project): void {
    project.workspaceUrl = `${(process.env.CODE_SERVER_URL || 'http://localhost:8080').replace(/\/$/, '')}/?folder=/workspaces/local-${project.id}/source`;
    project.frontendPreviewUrl = `http://localhost:5173/preview/${project.id}`;
    project.apiPreviewUrl = `http://localhost:5173/api-preview/${project.id}`;
  }
}
