import { ProjectsService } from './projects.service';
import { ProjectStatus } from '../entities/project.entity';

describe('ProjectsService', () => {
  it('returns only projects owned by the authenticated user', async () => {
    const projectRepository = {
      find: jest.fn().mockResolvedValue([
        { id: 'owned', owner: { id: 'user-1' }, name: 'Owned' },
      ]),
    };
    const service = new ProjectsService(projectRepository as never, {} as never, {} as never, {} as never);

    const projects = await service.listForOwner('user-1');

    expect(projectRepository.find).toHaveBeenCalledWith({
      where: { owner: { id: 'user-1' } },
      relations: { owner: true, template: true },
      order: { updatedAt: 'DESC' },
    });
    expect(projects).toEqual([{ id: 'owned', owner: { id: 'user-1' }, name: 'Owned' }]);
  });

  it('refreshes provider lifecycle state for projects in the owner list', async () => {
    const project = {
      id: 'project-list-1', owner: { id: 'user-1', coderUsername: 'alex' }, workspaceId: 'coder-workspace-1',
      status: ProjectStatus.Running, lastKnownError: null, currentCommit: null,
    };
    const projectRepository = {
      find: jest.fn().mockResolvedValue([project]),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const provider = { describe: jest.fn().mockResolvedValue({ lifecycleStatus: ProjectStatus.Stopped, currentCommit: 'commit-1' }) };
    const service = new ProjectsService(projectRepository as never, {} as never, {} as never, provider as never);

    const result = await service.listForOwner('user-1');

    expect(provider.describe).toHaveBeenCalledWith('coder-workspace-1', 'alex');
    expect(result[0].status).toBe(ProjectStatus.Stopped);
    expect(result[0].currentCommit).toBe('commit-1');
  });

  it('returns the original project for a repeated idempotency key', async () => {
    const original = { id: 'project-1', owner: { id: 'user-1' }, name: 'Tracker' };
    const projectRepository = {
      findOne: jest.fn().mockResolvedValue(original),
      create: jest.fn(),
      save: jest.fn(),
    };
    const userRepository = { findOneBy: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    const templateRepository = { findOneBy: jest.fn().mockResolvedValue({ id: 'golden' }) };
    const service = new ProjectsService(projectRepository as never, userRepository as never, templateRepository as never, {} as never);

    const result = await service.create('user-1', { name: 'Tracker' }, 'request-123');

    expect(result).toBe(original);
    expect(projectRepository.create).not.toHaveBeenCalled();
  });

  it('recovers the original project when a concurrent request wins the idempotency constraint', async () => {
    const original = { id: 'project-concurrent', owner: { id: 'user-1' }, name: 'Tracker' };
    const projectRepository = {
      findOne: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(original),
      create: jest.fn().mockReturnValue({ id: 'loser' }),
      save: jest.fn().mockRejectedValue({ code: '23505' }),
    };
    const userRepository = { findOneBy: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    const templateRepository = { findOneBy: jest.fn().mockResolvedValue({ id: 'golden' }) };
    const service = new ProjectsService(projectRepository as never, userRepository as never, templateRepository as never, {} as never);

    await expect(service.create('user-1', { name: 'Tracker' }, 'request-concurrent')).resolves.toBe(original);
    expect(projectRepository.findOne).toHaveBeenCalledTimes(3);
  });

  it('keeps the last lifecycle state and records a correlation id when the provider is unavailable', async () => {
    const project = {
      id: 'project-2',
      owner: { id: 'user-1' },
      status: 'Running',
      workspaceId: 'coder-workspace-2',
      lastKnownError: null,
      lastOpenedAt: null,
    };
    const projectRepository = {
      findOne: jest.fn().mockResolvedValue(project),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const provider = { describe: jest.fn().mockRejectedValue(new Error('Coder gateway unavailable')) };
    const service = new ProjectsService(projectRepository as never, {} as never, {} as never, provider as never);

    const result = await service.getForOwner('user-1', 'project-2');

    expect(result.status).toBe('Running');
    expect(result.lastKnownError).toMatch(/^Coder gateway unavailable \(request [0-9a-f-]{36}\)$/);
  });

  it('returns the provider-reported lifecycle after a start request', async () => {
    const project = {
      id: 'project-3',
      owner: { id: 'user-1' },
      status: ProjectStatus.Stopped,
      workspaceId: 'coder-workspace-3',
      lastKnownError: null,
    };
    const projectRepository = {
      findOne: jest.fn().mockResolvedValue(project),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const provider = {
      start: jest.fn().mockResolvedValue(undefined),
      describe: jest.fn().mockResolvedValue({ lifecycleStatus: ProjectStatus.Creating, currentCommit: null }),
    };
    const service = new ProjectsService(projectRepository as never, {} as never, {} as never, provider as never);

    const result = await service.setLifecycle('user-1', 'project-3', ProjectStatus.Running);

    expect(provider.start).toHaveBeenCalledWith('coder-workspace-3');
    expect(provider.describe).toHaveBeenCalledWith('coder-workspace-3');
    expect(result.status).toBe(ProjectStatus.Creating);
  });

  it('passes the platform owner mapping when provisioning a Coder workspace', async () => {
    const owner = { id: 'user-1', email: 'alex@example.test', coderUsername: 'alex' };
    const creating = { id: 'project-4', owner, name: 'Tracker', status: ProjectStatus.Creating, workspaceId: 'local-workspace-4' };
    const projectRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue(creating),
      save: jest.fn().mockResolvedValue(creating),
    };
    const userRepository = { findOneBy: jest.fn().mockResolvedValue(owner) };
    const templateRepository = { findOneBy: jest.fn().mockResolvedValue({ id: 'golden' }) };
    const provider = {
      provision: jest.fn().mockResolvedValue({ workspaceId: 'coder-project-4', sourceRepository: null, currentCommit: null, workspaceUrl: null }),
      describe: jest.fn().mockResolvedValue({ lifecycleStatus: ProjectStatus.Creating, currentCommit: null }),
    };
    const service = new ProjectsService(projectRepository as never, userRepository as never, templateRepository as never, provider as never);

    await service.create('user-1', { name: 'Tracker' });
    await new Promise((resolve) => setImmediate(resolve));

    expect(provider.provision).toHaveBeenCalledWith('project-4', 'Tracker', 'alex');
  });

  it('keeps a newly provisioned project Creating until the provider reports readiness', async () => {
    const owner = { id: 'user-1', email: 'alex@example.test', coderUsername: 'alex' };
    const creating = { id: 'project-5', owner, name: 'Tracker', status: ProjectStatus.Creating, workspaceId: 'local-workspace-5' };
    const projectRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue(creating),
      save: jest.fn().mockResolvedValue(creating),
    };
    const userRepository = { findOneBy: jest.fn().mockResolvedValue(owner) };
    const templateRepository = { findOneBy: jest.fn().mockResolvedValue({ id: 'golden' }) };
    const provider = {
      provision: jest.fn().mockResolvedValue({ workspaceId: 'coder-project-5', sourceRepository: null, currentCommit: null, workspaceUrl: null }),
      describe: jest.fn().mockResolvedValue({ lifecycleStatus: ProjectStatus.Creating, currentCommit: null }),
    };
    const service = new ProjectsService(projectRepository as never, userRepository as never, templateRepository as never, provider as never);

    await service.create('user-1', { name: 'Tracker' });
    await new Promise((resolve) => setImmediate(resolve));

    expect(provider.describe).toHaveBeenCalledWith('coder-project-5', 'alex');
    expect(creating.status).toBe(ProjectStatus.Creating);
  });

  it('normalizes persisted local preview links to the authenticated portal route', async () => {
    const project = {
      id: 'project-6',
      owner: { id: 'user-1' },
      workspaceId: 'local-project-6',
      apiPreviewUrl: 'http://localhost:3000/api/preview/projects/project-6/requests',
      frontendPreviewUrl: 'http://localhost:5173/preview/project-6',
      lastOpenedAt: null,
    };
    const projectRepository = {
      findOne: jest.fn().mockResolvedValue(project),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const provider = { describe: jest.fn().mockResolvedValue({ lifecycleStatus: ProjectStatus.Running, currentCommit: null }) };
    const service = new ProjectsService(projectRepository as never, {} as never, {} as never, provider as never);

    const result = await service.getForOwner('user-1', 'project-6');

    expect(result.apiPreviewUrl).toBe('http://localhost:5173/api-preview/project-6');
  });

  it('reflects the local workspace lifecycle before returning a project', async () => {
    const project = {
      id: 'project-7', owner: { id: 'user-1' }, workspaceId: 'local-project-7', status: ProjectStatus.Running,
      lastKnownError: null, lastOpenedAt: null,
    };
    const projectRepository = {
      findOne: jest.fn().mockResolvedValue(project),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const provider = { describe: jest.fn().mockResolvedValue({ lifecycleStatus: ProjectStatus.Stopped, currentCommit: null }) };
    const service = new ProjectsService(projectRepository as never, {} as never, {} as never, provider as never);

    const result = await service.getForOwner('user-1', 'project-7');

    expect(provider.describe).toHaveBeenCalledWith('local-project-7');
    expect(result.status).toBe(ProjectStatus.Stopped);
  });
});
