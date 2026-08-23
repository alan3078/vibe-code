import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  it('replaces an oversized client request ID before it reaches audit storage', () => {
    const request = { headers: { 'x-request-id': 'x'.repeat(121) } };
    const response = { header: jest.fn() };
    const next = jest.fn();

    new RequestIdMiddleware().use(request, response, next);

    expect(request.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.header).toHaveBeenCalledWith('x-request-id', request.headers['x-request-id']);
    expect(next).toHaveBeenCalled();
  });
});
