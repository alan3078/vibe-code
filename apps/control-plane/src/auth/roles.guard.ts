import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, @InjectRepository(User) private readonly userRepository: Repository<User>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]) || [];
    if (required.length === 0) return true;
    const request = context.switchToHttp().getRequest<{ user?: { sub?: string; role?: UserRole } }>();
    const currentUser = request.user?.sub ? await this.userRepository.findOneBy({ id: request.user.sub }) : null;
    if (!currentUser || !required.includes(currentUser.role)) throw new ForbiddenException('Administrator access is required');
    if (request.user) request.user.role = currentUser.role;
    return true;
  }
}
