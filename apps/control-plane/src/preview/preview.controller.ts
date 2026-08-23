import { Body, ConflictException, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';
import { WORKSPACE_PROVIDER, WorkspaceProvider } from '../workspace/workspace-provider';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { Audit } from '../audit/audit.decorator';

@Controller('preview/projects/:projectId/requests')
@UseGuards(JwtAuthGuard)
export class PreviewController {
  constructor(
    private readonly projectsService: ProjectsService,
    @Inject(WORKSPACE_PROVIDER) private readonly workspaceService: WorkspaceProvider,
  ) {}

  @Get()
  @Audit('PROJECT_PREVIEW_READ', 'Project')
  async list(@CurrentUser() user: { sub: string }, @Param('projectId') projectId: string) {
    const project = await this.projectsService.getForOwner(user.sub, projectId);
    this.assertPreviewAvailable(project.status);
    return this.workspaceService.listRequests(project.workspaceId);
  }

  @Post()
  @Audit('PROJECT_PREVIEW_REQUEST_CREATED', 'Project')
  async create(@CurrentUser() user: { sub: string }, @Param('projectId') projectId: string, @Body() dto: CreateRequestDto) {
    const project = await this.projectsService.getForOwner(user.sub, projectId);
    this.assertPreviewAvailable(project.status);
    return this.workspaceService.createRequest(project.workspaceId, dto);
  }

  @Patch(':requestId')
  @Audit('PROJECT_PREVIEW_REQUEST_UPDATED', 'Project')
  async update(
    @CurrentUser() user: { sub: string },
    @Param('projectId') projectId: string,
    @Param('requestId') requestId: string,
    @Body() dto: UpdateRequestDto,
  ) {
    const project = await this.projectsService.getForOwner(user.sub, projectId);
    this.assertPreviewAvailable(project.status);
    return this.workspaceService.updateRequest(project.workspaceId, requestId, dto.status);
  }

  private assertPreviewAvailable(status: string): void {
    if (status !== 'Running') throw new ConflictException('Preview is available only while the workspace is running');
  }
}
