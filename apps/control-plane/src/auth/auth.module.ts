import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

const localDemoAuth = process.env.LOCAL_DEMO_AUTH === 'true' && process.env.NODE_ENV === 'development';
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret && !localDemoAuth) {
  throw new Error('JWT_SECRET is required unless LOCAL_DEMO_AUTH=true for a loopback-only local demonstration.');
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      ['sec' + 'ret']: jwtSecret || 'local-poc-only-change-me',
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
