import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../entities/user.entity';

describe('RolesGuard', () => {
  it('uses the current database role instead of a stale JWT role', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.Administrator]) };
    const repository = { findOneBy: jest.fn().mockResolvedValue({ id: 'user-1', role: UserRole.Member }) };
    const request = { user: { sub: 'user-1', role: UserRole.Administrator } };
    const context = { getHandler: jest.fn(), getClass: jest.fn(), switchToHttp: () => ({ getRequest: () => request }) };
    const guard = new RolesGuard(reflector as never, repository as never);

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
