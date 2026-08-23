import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'required-roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
