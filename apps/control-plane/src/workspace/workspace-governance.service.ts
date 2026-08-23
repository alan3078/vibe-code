import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { PlatformConfigurationService } from '../configuration/platform-configuration.service';
import { AuditActorType, AuditOutcome } from '../entities/audit-log.entity';
import { Project, ProjectStatus } from '../entities/project.entity';
import { WORKSPACE_PROVIDER, WorkspaceProvider } from './workspace-provider';

@Injectable()
export class WorkspaceGovernanceService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WorkspaceGovernanceService.name);
  private timer: NodeJS.Timeout | undefined;
  private lastReconciledAt = 0;
  private reconciling = false;

  constructor(
    @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
    @Inject(WORKSPACE_PROVIDER) private readonly workspaceProvider: WorkspaceProvider,
    private readonly configurationService: PlatformConfigurationService,
    private readonly auditService: AuditService,
  ) {}

  onApplicationBootstrap(): void {
    void this.reconcile();
    this.timer = setInterval(() => void this.reconcile(), 10_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async reconcile(force = false): Promise<void> {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      const intervalSeconds = await this.configurationService.getPositiveInteger('workspace.reaper_interval_seconds');
      const now = Date.now();
      if (!force && now - this.lastReconciledAt < intervalSeconds * 1_000) return;
      this.lastReconciledAt = now;

      const [maxActivePerUser, idleTimeoutMinutes, projects] = await Promise.all([
        this.configurationService.getPositiveInteger('workspace.max_active_per_user'),
        this.configurationService.getPositiveInteger('workspace.idle_timeout_minutes'),
        this.projectRepository.find({
          where: { status: In([ProjectStatus.Creating, ProjectStatus.Starting, ProjectStatus.Running, ProjectStatus.Stopping]), deletedAt: IsNull() },
          relations: { owner: true },
          order: { updatedAt: 'DESC' },
        }),
      ]);
      const stopped = new Set<string>();
      const byOwner = new Map<string, Project[]>();
      for (const project of projects) {
        const ownerId = project.owner.id;
        byOwner.set(ownerId, [...(byOwner.get(ownerId) || []), project]);
      }
      for (const ownerProjects of byOwner.values()) {
        ownerProjects.sort((left, right) => this.activityTime(right) - this.activityTime(left));
        for (const project of ownerProjects.slice(maxActivePerUser)) {
          await this.stopForPolicy(project, 'active_workspace_limit');
          stopped.add(project.id);
        }
      }
      const idleBefore = now - idleTimeoutMinutes * 60_000;
      for (const project of projects) {
        if (stopped.has(project.id) || this.activityTime(project) >= idleBefore) continue;
        await this.stopForPolicy(project, 'idle_timeout');
      }
    } catch (error) {
      this.logger.error('Workspace governance reconciliation failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.reconciling = false;
    }
  }

  private activityTime(project: Project): number {
    return (project.lastActivityAt || project.provisionedAt || project.updatedAt || project.createdAt || new Date(0)).getTime();
  }

  private async stopForPolicy(project: Project, reason: 'active_workspace_limit' | 'idle_timeout'): Promise<void> {
    if (project.status === ProjectStatus.Stopping) return;
    const claimed = await this.compareAndSet(project.id, project.status, { status: ProjectStatus.Stopping, statusChangedAt: new Date() });
    if (!claimed) return;
    try {
      await this.auditService.record({
        actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_POLICY_STOP_REQUESTED',
        resourceType: 'Project', resourceId: project.id, projectId: project.id,
        outcome: AuditOutcome.Success, requestId: null, metadata: { workspaceId: project.workspaceId, reason },
      });
      await this.workspaceProvider.stop(project.workspaceId);
      const stoppedAt = new Date();
      if (!await this.compareAndSet(project.id, ProjectStatus.Stopping, { status: ProjectStatus.Stopped, stoppedAt, statusChangedAt: stoppedAt })) return;
      await this.auditService.recordCompletion({
        actorType: AuditActorType.System,
        actorRole: null,
        action: 'WORKSPACE_STOPPED_BY_POLICY',
        resourceType: 'Project',
        resourceId: project.id,
        projectId: project.id,
        outcome: AuditOutcome.Success,
        requestId: null,
        metadata: { workspaceId: project.workspaceId, reason },
      });
    } catch (error) {
      if (!await this.compareAndSet(project.id, ProjectStatus.Stopping, { status: ProjectStatus.Failed, statusChangedAt: new Date(), lastKnownError: 'Workspace governance stop failed; contact an administrator for diagnostics.' })) return;
      await this.auditService.recordCompletion({
        actorType: AuditActorType.System,
        actorRole: null,
        action: 'WORKSPACE_POLICY_STOP_FAILED',
        resourceType: 'Project',
        resourceId: project.id,
        projectId: project.id,
        outcome: AuditOutcome.Failure,
        requestId: null,
        metadata: { workspaceId: project.workspaceId, reason, message: error instanceof Error ? error.message : 'unknown error' },
      });
    }
  }

  private async compareAndSet(projectId: string, expected: ProjectStatus, patch: Partial<Project>): Promise<boolean> {
    if (typeof this.projectRepository.update === 'function') {
      const result = await this.projectRepository.update({ id: projectId, status: expected }, patch);
      return Boolean(result.affected);
    }
    const current = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!current || current.status !== expected) return false;
    Object.assign(current, patch);
    await this.projectRepository.save(current);
    return true;
  }
}
