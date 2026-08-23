import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST', url: '/api/projects', params: {},
        headers: { 'x-request-id': 'request-1' },
        user: { sub: 'user-1', role: 'Member' },
      }),
    }),
  } as never;

  it('durably records the request before invoking a governed handler', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ action: 'PROJECT_CREATE', resourceType: 'Project' }) };
    const sequence: string[] = [];
    const audit = {
      record: jest.fn().mockImplementation(async (event) => { sequence.push(event.action); return event; }),
      recordCompletion: jest.fn().mockImplementation(async (event) => { sequence.push(event.action); return event; }),
    };
    const handler = { handle: jest.fn(() => { sequence.push('handler'); return of({ id: 'project-1' }); }) };
    const interceptor = new AuditInterceptor(reflector as never, audit as never);

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(sequence).toEqual(['PROJECT_CREATE_REQUESTED', 'handler', 'PROJECT_CREATE_COMPLETED']);
  });

  it('does not invoke the handler when the durable request audit cannot be written', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ action: 'PROJECT_CREATE', resourceType: 'Project' }) };
    const audit = { record: jest.fn().mockRejectedValue(new Error('audit unavailable')), recordCompletion: jest.fn() };
    const handler = { handle: jest.fn(() => of({ id: 'project-1' })) };
    const interceptor = new AuditInterceptor(reflector as never, audit as never);

    await expect(lastValueFrom(interceptor.intercept(context, handler))).rejects.toThrow('audit unavailable');
    expect(handler.handle).not.toHaveBeenCalled();
  });
});
