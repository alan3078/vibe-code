import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from '../entities/project.entity';
import { Template } from '../entities/template.entity';
import { User } from '../entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { WORKSPACE_PROVIDER, WorkspaceProvider } from '../workspace/workspace-provider';

const GOLDEN_TEMPLATE_ID = 'golden-react-nest-postgres';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Template) private readonly templateRepository: Repository<Template>,
    @Inject(WORKSPACE_PROVIDER) private readonly workspaceService: WorkspaceProvider,
  ) {}

  async listForOwner(ownerId: string): Promise<Project[]> {
    const projects = await this.projectRepository.find({
      where: { owner: { id: ownerId } },
      relations: { owner: true, template: true },
      order: { updatedAt: 'DESC' },
    });
    await Promise.all(projects.map(async (project) => {
      if (!project.workspaceId) return;
      await this.refreshFromProvider(project);
      await this.projectRepository.save(project);
    }));
    return projects;
  }

  async getForOwner(ownerId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, owner: { id: ownerId } },
      relations: { owner: true, template: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (this.isLocalWorkspace(project.workspaceId)) {
      this.normalizeLocalPreviewUrls(project);
      await this.refreshFromProvider(project);
    } else if (project.workspaceId) {
      await this.refreshFromProvider(project);
    }
    project.lastOpenedAt = new Date();
    return this.projectRepository.save(project);
  }

  async create(ownerId: string, dto: CreateProjectDto, idempotencyKey?: string): Promise<Project> {
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
    const duplicate = await this.projectRepository.findOne({ where: { owner: { id: ownerId }, name: dto.name } });
    if (duplicate) {
      throw new ConflictException('You already have a project with this name');
    }

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
    void this.provisionWorkspace(creating);
    return creating;
  }

  private async provisionWorkspace(creating: Project): Promise<void> {
    try {
      const workspace = await this.workspaceService.provision(creating.id, creating.name, creating.owner?.coderUsername || undefined);
      creating.workspaceId = workspace.workspaceId;
      creating.workspaceUrl = workspace.workspaceUrl || `http://localhost:5173/workspaces/${creating.id}`;
      creating.frontendPreviewUrl = workspace.frontendPreviewUrl || `http://localhost:5173/preview/${creating.id}`;
      creating.apiPreviewUrl = workspace.apiPreviewUrl || `http://localhost:3000/api/preview/projects/${creating.id}/requests`;
      creating.sourceRepository = workspace.sourceRepository;
      const reflected = creating.owner?.coderUsername
        ? await this.workspaceService.describe(workspace.workspaceId, creating.owner.coderUsername)
        : await this.workspaceService.describe(workspace.workspaceId);
      creating.currentCommit = reflected.currentCommit || workspace.currentCommit;
      creating.status = reflected.lifecycleStatus ? (reflected.lifecycleStatus as ProjectStatus) : ProjectStatus.Creating;
      await this.projectRepository.save(creating);
    } catch (error) {
      creating.status = ProjectStatus.Failed;
      creating.lastKnownError = this.correlatedError(error instanceof Error ? error.message : 'Workspace provisioning failed');
      console.error(`[workspace-provisioning] project=${creating.id} ${creating.lastKnownError}`);
      await this.projectRepository.save(creating);
    }
  }

  async setLifecycle(ownerId: string, projectId: string, status: ProjectStatus): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, owner: { id: ownerId } },
      relations: { owner: true, template: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (status === ProjectStatus.Running && project.status === ProjectStatus.Failed) {
      project.status = ProjectStatus.Creating;
      project.lastKnownError = null;
      const retrying = await this.projectRepository.save(project);
      void this.provisionWorkspace(retrying);
      return retrying;
    }
    if (status === ProjectStatus.Running) await this.workspaceService.start(project.workspaceId);
    if (status === ProjectStatus.Stopped) await this.workspaceService.stop(project.workspaceId);
    await this.refreshFromProvider(project);
    return this.projectRepository.save(project);
  }

  private async refreshFromProvider(project: Project): Promise<void> {
    try {
      const workspace = project.owner?.coderUsername
        ? await this.workspaceService.describe(project.workspaceId, project.owner.coderUsername)
        : await this.workspaceService.describe(project.workspaceId);
      if (workspace.lifecycleStatus) project.status = workspace.lifecycleStatus as ProjectStatus;
      project.currentCommit = workspace.currentCommit || project.currentCommit;
      project.lastKnownError = workspace.lifecycleStatus === ProjectStatus.Failed
        ? (project.lastKnownError || 'Workspace reported a failed lifecycle')
        : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workspace provider unavailable';
      project.lastKnownError = this.correlatedError(message);
      console.error(`[workspace-status] project=${project.id} ${project.lastKnownError}`);
    }
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
