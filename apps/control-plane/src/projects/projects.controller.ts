import { Body, Controller, Delete, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { Audit } from '../audit/audit.decorator';
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
  @Audit('PROJECT_LISTED', 'Project')
  list(@CurrentUser() user: { sub: string }, @Headers('x-request-id') requestId: string | undefined) {
    return this.projectsService.listForOwner(user.sub, requestId || null);
  }

  @Post()
  @Audit('PROJECT_CREATE_REQUESTED', 'Project')
  create(
    @CurrentUser() user: { sub: string },
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(user.sub, dto, idempotencyKey, requestId || null);
  }

  @Get(':id')
  @Audit('PROJECT_VIEWED', 'Project')
  get(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Headers('x-request-id') requestId: string | undefined) {
    return this.projectsService.getForOwner(user.sub, id, requestId || null);
  }

  @Post(':id/start')
  @Audit('WORKSPACE_START_REQUESTED', 'Project')
  start(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Headers('x-request-id') requestId: string | undefined) {
    return this.projectsService.setLifecycle(user.sub, id, ProjectStatus.Running, requestId || null);
  }

  @Post(':id/stop')
  @Audit('WORKSPACE_STOP_REQUESTED', 'Project')
  stop(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Headers('x-request-id') requestId: string | undefined) {
    return this.projectsService.setLifecycle(user.sub, id, ProjectStatus.Stopped, requestId || null);
  }

  @Delete(':id')
  @Audit('PROJECT_DELETE_REQUESTED', 'Project')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string, @Headers('x-request-id') requestId: string | undefined) {
    return this.projectsService.deleteForOwner(user.sub, id, requestId || null);
  }
}
