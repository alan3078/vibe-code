import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectStatus } from '../entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.projectsService.listForOwner(user.sub);
  }

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(user.sub, dto, idempotencyKey);
  }

  @Get(':id')
  get(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.projectsService.getForOwner(user.sub, id);
  }

  @Post(':id/start')
  start(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.projectsService.setLifecycle(user.sub, id, ProjectStatus.Running);
  }

  @Post(':id/stop')
  stop(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.projectsService.setLifecycle(user.sub, id, ProjectStatus.Stopped);
  }
}
