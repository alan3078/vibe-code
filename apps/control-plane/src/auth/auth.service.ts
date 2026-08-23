import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async demoLogin(userId: string) {
    if (process.env.LOCAL_DEMO_AUTH !== 'true' || process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Demo login is disabled. Configure a real identity provider for shared deployments.');
    }
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Demo user not found');
    }
    return this.issueSession(user);
  }

  async me(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  private async issueSession(user: User) {
    const profile = { id: user.id, name: user.name, email: user.email, role: user.role };
    return { token: await this.jwtService.signAsync({ sub: user.id, email: user.email, name: user.name, role: user.role }), user: profile };
  }
}
