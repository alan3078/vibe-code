import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Audit } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ProjectStatus } from '../entities/project.entity';
import { UserRole } from '../entities/user.entity';
import { AdminService } from './admin.service';
import { AdminCreateProjectDto } from './dto/admin-create-project.dto';
import { AuditCmsQueryDto, ConfigurationCmsQueryDto, ProjectCmsQueryDto, UserCmsQueryDto } from './dto/cms-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Administrator)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @Audit('ADMIN_OVERVIEW_VIEWED', 'Administration')
  overview() { return this.adminService.overview(); }

  @Get('cms/projects')
  @Audit('ADMIN_PROJECTS_CMS_VIEWED', 'Project')
  projectPage(@Query() query: ProjectCmsQueryDto) {
    return this.adminService.listProjectPage(query);
  }

  @Post('projects')
  @Audit('ADMIN_PROJECT_CREATE_REQUESTED', 'Project')
  createProject(@CurrentUser() user: { sub: string; role: UserRole }, @Body() dto: AdminCreateProjectDto, @Headers('idempotency-key') idempotencyKey: string | undefined, @Headers('x-request-id') requestId: string | undefined) {
    return this.adminService.createProject({ id: user.sub, role: user.role }, dto, idempotencyKey, requestId || null);
  }

  @Post('projects/:id/start')
  @Audit('ADMIN_WORKSPACE_START_REQUESTED', 'Project')
  start(@Param('id') id: string, @Headers('x-request-id') requestId: string | undefined) { return this.adminService.setProjectLifecycle(id, ProjectStatus.Running, requestId || null); }

  @Post('projects/:id/stop')
  @Audit('ADMIN_WORKSPACE_STOP_REQUESTED', 'Project')
  stop(@Param('id') id: string, @Headers('x-request-id') requestId: string | undefined) { return this.adminService.setProjectLifecycle(id, ProjectStatus.Stopped, requestId || null); }

  @Delete('projects/:id')
  @Audit('ADMIN_PROJECT_DELETE_REQUESTED', 'Project')
  remove(@Param('id') id: string, @Headers('x-request-id') requestId: string | undefined) { return this.adminService.deleteProject(id, requestId || null); }

  @Get('cms/configuration-groups')
  @Audit('ADMIN_CONFIGURATION_GROUPS_CMS_VIEWED', 'ConfigurationGroup')
  configurationGroupPage(@Query() query: ConfigurationCmsQueryDto) {
    return this.adminService.listConfigurationGroupPage(query);
  }

  @Get('cms/configuration')
  @Audit('ADMIN_CONFIGURATION_CMS_VIEWED', 'ConfigurationItem')
  configurationPage(@Query() query: ConfigurationCmsQueryDto) {
    return this.adminService.listConfigurationPage(query);
  }

  @Patch('configuration/:key')
  @Audit('CONFIGURATION_UPDATE_REQUESTED', 'ConfigurationItem')
  updateConfiguration(@CurrentUser() user: { sub: string; role: UserRole }, @Param('key') key: string, @Body() dto: UpdateConfigurationDto, @Headers('x-request-id') requestId: string | undefined) {
    return this.adminService.updateConfiguration({ id: user.sub, role: user.role }, key, dto.value, requestId || null);
  }

  @Get('cms/audit')
  @Audit('ADMIN_AUDIT_CMS_VIEWED', 'AuditLog')
  auditPage(@Query() query: AuditCmsQueryDto) {
    return this.adminService.listAuditPage(query);
  }

  @Get('cms/users')
  @Audit('ADMIN_USERS_CMS_VIEWED', 'User')
  userPage(@Query() query: UserCmsQueryDto) {
    return this.adminService.listUserPage(query);
  }

  @Get('roles')
  @Audit('ADMIN_ROLES_VIEWED', 'Role')
  roles() {
    return this.adminService.listRoles();
  }

  @Patch('users/:id/role')
  @Audit('USER_ROLE_UPDATE_REQUESTED', 'User')
  updateUserRole(@CurrentUser() user: { sub: string; role: UserRole }, @Param('id') id: string, @Body() dto: UpdateUserRoleDto, @Headers('x-request-id') requestId: string | undefined) {
    return this.adminService.updateUserRole({ id: user.sub, role: user.role }, id, dto.role, requestId || null);
  }
}
