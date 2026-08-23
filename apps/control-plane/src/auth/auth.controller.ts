import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';

class DemoLoginDto {
  @IsUUID()
  userId!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('demo-login')
  demoLogin(@Body() dto: DemoLoginDto) {
    return this.authService.demoLogin(dto.userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { sub: string }) {
    return this.authService.me(user.sub);
  }
}
