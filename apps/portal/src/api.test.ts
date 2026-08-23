import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('portal API error contract', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves validation messages and request IDs from the control plane', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      statusCode: 400,
      message: ['name must be longer than or equal to 2 characters'],
      requestId: 'request-validation-1',
    }), { status: 400, headers: { 'content-type': 'application/json', 'x-request-id': 'header-request-1' } })));

    await expect(api.createProject({ name: 'x' }, '00000000-0000-0000-0000-000000000001')).rejects.toMatchObject({
      message: 'name must be longer than or equal to 2 characters',
      requestId: 'request-validation-1',
      status: 400,
    });
  });
});
