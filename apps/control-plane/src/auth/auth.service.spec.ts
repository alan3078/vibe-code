import { AuthService } from './auth.service';

describe('AuthService local named-user login', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('rejects demo login in production', async () => {
    process.env.NODE_ENV = 'production';
    const service = new AuthService({} as never, {} as never);

    await expect(service.demoLogin('user-1')).rejects.toMatchObject({ status: 403 });
  });

  it('rejects unknown local named users', async () => {
    process.env.LOCAL_DEMO_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    const userRepository = { findOneBy: jest.fn().mockResolvedValue(null) };
    const service = new AuthService(userRepository as never, {} as never);

    await expect(service.demoLogin('user-1')).rejects.toMatchObject({ status: 404 });
  });

  it('issues a JWT session for a known local named user', async () => {
    process.env.LOCAL_DEMO_AUTH = 'true';
    process.env.NODE_ENV = 'development';
    const user = { id: 'user-1', email: 'alex@example.test', name: 'Alex Chen' };
    const userRepository = { findOneBy: jest.fn().mockResolvedValue(user) };
    const jwtService = { signAsync: jest.fn().mockResolvedValue('signed-session') };
    const service = new AuthService(userRepository as never, jwtService as never);

    await expect(service.demoLogin(user.id)).resolves.toEqual({ token: 'signed-session', user });
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: user.id, email: user.email, name: user.name });
  });
});
