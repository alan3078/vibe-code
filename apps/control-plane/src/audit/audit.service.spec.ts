import { AuditActorType, AuditOutcome } from '../entities/audit-log.entity';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('records a system lifecycle failure without requiring an interactive user actor', async () => {
    const repository = { create: jest.fn((value) => value), save: jest.fn().mockImplementation(async (value) => value) };
    const service = new AuditService(repository as never);

    await service.record({
      actorType: AuditActorType.System,
      actorRole: null,
      action: 'WORKSPACE_PROVISION_FAILED',
      resourceType: 'Project',
      resourceId: 'project-1',
      projectId: 'project-1',
      outcome: AuditOutcome.Failure,
      requestId: 'request-1',
      metadata: { message: 'Docker provider unavailable' },
    });

    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      actorType: AuditActorType.System,
      action: 'WORKSPACE_PROVISION_FAILED',
      outcome: AuditOutcome.Failure,
      requestId: 'request-1',
    }));
  });

  it('keeps completion-audit failure separate from an already completed provider operation', async () => {
    const repository = { create: jest.fn((value) => value), save: jest.fn().mockRejectedValue(new Error('audit unavailable')) };
    const service = new AuditService(repository as never);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(service.recordCompletion({
      actorType: AuditActorType.System, actorRole: null, action: 'WORKSPACE_STARTED',
      resourceType: 'Project', resourceId: 'project-1', projectId: 'project-1',
      outcome: AuditOutcome.Success, requestId: 'request-1',
    })).resolves.toBeNull();

    expect(consoleError).toHaveBeenCalledWith('Unable to persist audit completion event', expect.any(Error));
    consoleError.mockRestore();
  });
});
