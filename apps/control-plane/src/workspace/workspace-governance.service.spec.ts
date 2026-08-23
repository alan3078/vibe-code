import { WorkspaceGovernanceService } from './workspace-governance.service';
import { ProjectStatus } from '../entities/project.entity';

describe('WorkspaceGovernanceService', () => {
  it('stops surplus running workspaces and idle workspaces using administrator-managed policy', async () => {
    const now = new Date('2026-08-23T12:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);
    const newest = {
      id: 'project-newest', owner: { id: 'member-1' }, workspaceId: 'workspace-newest', status: ProjectStatus.Running,
      lastActivityAt: new Date('2026-08-23T11:59:00.000Z'), provisionedAt: now,
    };
    const surplus = {
      id: 'project-surplus', owner: { id: 'member-1' }, workspaceId: 'workspace-surplus', status: ProjectStatus.Running,
      lastActivityAt: new Date('2026-08-23T11:58:00.000Z'), provisionedAt: now,
    };
    const idle = {
      id: 'project-idle', owner: { id: 'member-2' }, workspaceId: 'workspace-idle', status: ProjectStatus.Running,
      lastActivityAt: new Date('2026-08-23T10:00:00.000Z'), provisionedAt: now,
    };
    const repository = {
      find: jest.fn().mockResolvedValue([newest, surplus, idle]),
      save: jest.fn().mockImplementation(async (project) => project),
      update: jest.fn().mockImplementation(async (where, patch) => {
        const project = [newest, surplus, idle].find((candidate) => candidate.id === where.id && candidate.status === where.status);
        if (!project) return { affected: 0 };
        Object.assign(project, patch);
        return { affected: 1 };
      }),
    };
    const provider = { stop: jest.fn().mockResolvedValue(undefined) };
    const configuration = {
      getPositiveInteger: jest.fn((key: string) => Promise.resolve({
        'workspace.max_active_per_user': 1,
        'workspace.idle_timeout_minutes': 30,
        'workspace.reaper_interval_seconds': 30,
      }[key])),
    };
    const audit = { record: jest.fn().mockResolvedValue({}), recordCompletion: jest.fn().mockResolvedValue({}) };
    const service = new WorkspaceGovernanceService(repository as never, provider as never, configuration as never, audit as never);

    await service.reconcile(true);

    expect(provider.stop).toHaveBeenCalledWith('workspace-surplus');
    expect(provider.stop).toHaveBeenCalledWith('workspace-idle');
    expect(newest.status).toBe(ProjectStatus.Running);
    expect(surplus.status).toBe(ProjectStatus.Stopped);
    expect(idle.status).toBe(ProjectStatus.Stopped);
    jest.useRealTimers();
  });
});
