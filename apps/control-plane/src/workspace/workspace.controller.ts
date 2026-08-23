import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';
import { Audit } from '../audit/audit.decorator';
import { WORKSPACE_PROVIDER, WorkspaceProvider } from './workspace-provider';

@Controller('projects/:projectId/workspace')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(
    private readonly projectsService: ProjectsService,
    @Inject(WORKSPACE_PROVIDER) private readonly workspaceService: WorkspaceProvider,
  ) {}

  @Get()
  @Audit('WORKSPACE_DESCRIBED', 'Project')
  async describe(@CurrentUser() user: { sub: string }, @Param('projectId') projectId: string) {
    const project = await this.projectsService.getForOwner(user.sub, projectId);
    return project.owner?.coderUsername
      ? this.workspaceService.describe(project.workspaceId, project.owner.coderUsername)
      : this.workspaceService.describe(project.workspaceId);
  }
}
