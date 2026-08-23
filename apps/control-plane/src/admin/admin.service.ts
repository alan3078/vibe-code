import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditActorType, AuditLog, AuditOutcome } from '../entities/audit-log.entity';
import { ConfigurationItem, ConfigurationValueType } from '../entities/configuration-item.entity';
import { ConfigurationGroup } from '../entities/configuration-group.entity';
import { Project, ProjectStatus } from '../entities/project.entity';
import { User, UserRole } from '../entities/user.entity';
import { ProjectsService } from '../projects/projects.service';
import { AdminCreateProjectDto } from './dto/admin-create-project.dto';
import { AuditCmsQueryDto, ConfigurationCmsQueryDto, ProjectCmsQueryDto, UserCmsQueryDto } from './dto/cms-query.dto';

type AdministratorActor = { id: string; role: UserRole };
export type CmsPage<T> = { items: T[]; total: number; page: number; pageSize: number };
export type RoleSummary = { role: UserRole; description: string; userCount: number };

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(ConfigurationItem) private readonly configurationRepository: Repository<ConfigurationItem>,
    @InjectRepository(ConfigurationGroup) private readonly configurationGroupRepository: Repository<ConfigurationGroup>,
    @InjectRepository(AuditLog) private readonly auditRepository: Repository<AuditLog>,
    private readonly projectsService: ProjectsService,
    private readonly auditService: AuditService,
  ) {}

  async listProjectPage({ name, owner, status, workspaceId, createdFrom, createdTo, page, pageSize }: ProjectCmsQueryDto): Promise<CmsPage<Project>> {
    const builder = this.projectRepository.createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.template', 'template')
      .where('project.deletedAt IS NULL');
    if (name) builder.andWhere('project.name ILIKE :name', { name: `%${name.trim()}%` });
    if (owner) builder.andWhere(new Brackets((where) => where
      .where('owner.name ILIKE :owner', { owner: `%${owner.trim()}%` })
      .orWhere('owner.email ILIKE :owner', { owner: `%${owner.trim()}%` })));
    if (status) builder.andWhere('project.status = :status', { status });
    if (workspaceId) builder.andWhere('project.workspaceId ILIKE :workspaceId', { workspaceId: `%${workspaceId.trim()}%` });
    if (createdFrom) builder.andWhere('project.createdAt >= :createdFrom', { createdFrom });
    if (createdTo) builder.andWhere('project.createdAt <= :createdTo', { createdTo: this.endOfDay(createdTo) });
    const [items, total] = await builder.orderBy('project.updatedAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items, total, page, pageSize };
  }

  async overview() {
    const [projects, creating, starting, running, stopped, failed] = await Promise.all([
      this.projectRepository.countBy({ deletedAt: IsNull() }),
      this.projectRepository.countBy({ status: ProjectStatus.Creating, deletedAt: IsNull() }),
      this.projectRepository.countBy({ status: ProjectStatus.Starting, deletedAt: IsNull() }),
      this.projectRepository.countBy({ status: ProjectStatus.Running, deletedAt: IsNull() }),
      this.projectRepository.countBy({ status: ProjectStatus.Stopped, deletedAt: IsNull() }),
      this.projectRepository.countBy({ status: ProjectStatus.Failed, deletedAt: IsNull() }),
    ]);
    return {
      projects,
      creating: creating + starting,
      running,
      stopped,
      failed,
    };
  }

  async listConfigurationGroupPage({ group, key, name, valueType, isMutable, isActive, page, pageSize }: ConfigurationCmsQueryDto): Promise<CmsPage<ConfigurationGroup>> {
    const builder = this.configurationGroupRepository.createQueryBuilder('group').leftJoinAndSelect('group.items', 'item');
    if (group) builder.andWhere(new Brackets((where) => where
      .where('group.name ILIKE :group', { group: `%${group.trim()}%` })
      .orWhere('group.key ILIKE :group', { group: `%${group.trim()}%` })));
    if (key) builder.andWhere('item.key ILIKE :key', { key: `%${key.trim()}%` });
    if (name) builder.andWhere('item.displayName ILIKE :name', { name: `%${name.trim()}%` });
    if (valueType) builder.andWhere('item.valueType = :valueType', { valueType });
    if (isMutable !== undefined) builder.andWhere('item.isMutable = :isMutable', { isMutable });
    if (isActive !== undefined) builder.andWhere('group.isActive = :isActive', { isActive });
    const [items, total] = await builder.orderBy('group.key', 'ASC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    await this.attachSafeConfigurationValues(items.flatMap((configurationGroup) => configurationGroup.items));
    return { items, total, page, pageSize };
  }

  async listConfigurationPage({ group, key, name, valueType, isMutable, isActive, page, pageSize }: ConfigurationCmsQueryDto): Promise<CmsPage<ConfigurationItem>> {
    const builder = this.configurationRepository.createQueryBuilder('item').leftJoinAndSelect('item.group', 'group');
    if (group) builder.andWhere(new Brackets((where) => where
      .where('group.name ILIKE :group', { group: `%${group.trim()}%` })
      .orWhere('group.key ILIKE :group', { group: `%${group.trim()}%` })));
    if (key) builder.andWhere('item.key ILIKE :key', { key: `%${key.trim()}%` });
    if (name) builder.andWhere('item.displayName ILIKE :name', { name: `%${name.trim()}%` });
    if (valueType) builder.andWhere('item.valueType = :valueType', { valueType });
    if (isMutable !== undefined) builder.andWhere('item.isMutable = :isMutable', { isMutable });
    if (isActive !== undefined) builder.andWhere('group.isActive = :isActive', { isActive });
    const [items, total] = await builder.orderBy('item.key', 'ASC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    await this.attachSafeConfigurationValues(items);
    return { items, total, page, pageSize };
  }

  async updateConfiguration(actor: AdministratorActor, key: string, value: string, requestId: string | null = null): Promise<ConfigurationItem> {
    return this.configurationRepository.manager.transaction(async (manager) => {
      const configurations = manager.getRepository(ConfigurationItem);
      const item = await configurations.createQueryBuilder('item').addSelect('item.value').leftJoinAndSelect('item.group', 'group').where('item.key = :key', { key }).getOne();
      if (!item) throw new NotFoundException('Configuration item not found');
      if (item.isSensitive) throw new ConflictException('Sensitive configuration is managed through the deployment secret store');
      if (item.group && !item.group.isActive) throw new ConflictException('Configuration group is inactive');
      if (!item.isMutable) throw new ConflictException('This configuration item is managed by deployment and cannot be changed in the portal');
      const normalized = this.validateValue(item, value);
      const previousValue = item.value;
      item.value = normalized;
      const updated = await configurations.save(item);
      const audits = manager.getRepository(AuditLog);
      await audits.save(audits.create({
        actorUser: { id: actor.id } as User, actorType: AuditActorType.User, actorRole: actor.role,
        action: 'CONFIGURATION_UPDATED', resourceType: 'ConfigurationItem', resourceId: item.key,
        project: null, outcome: AuditOutcome.Success, requestId,
        metadata: { key: item.key, previousValue, value: normalized },
      }));
      return updated;
    });
  }

  async listAuditPage({ user, action, resource, actorType, userRole, outcome, requestId, dateFrom, dateTo, page, pageSize }: AuditCmsQueryDto): Promise<CmsPage<AuditLog>> {
    const builder = this.auditRepository.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actorUser', 'actorUser')
      .leftJoinAndSelect('audit.project', 'project');
    if (user) builder.andWhere(new Brackets((where) => where
      .where('actorUser.name ILIKE :user', { user: `%${user.trim()}%` })
      .orWhere('actorUser.email ILIKE :user', { user: `%${user.trim()}%` })));
    if (action) builder.andWhere('audit.action ILIKE :action', { action: `%${action.trim()}%` });
    if (resource) builder.andWhere(new Brackets((where) => where
      .where('audit.resourceType ILIKE :resource', { resource: `%${resource.trim()}%` })
      .orWhere('audit.resourceId ILIKE :resource', { resource: `%${resource.trim()}%` })));
    if (actorType === AuditActorType.User) builder.andWhere("audit.actorType IN ('User', 'Member', 'Administrator')");
    if (actorType === AuditActorType.System) builder.andWhere('audit.actorType = :actorType', { actorType });
    if (userRole) builder.andWhere('audit.actorRole = :userRole', { userRole });
    if (outcome) builder.andWhere('audit.outcome = :outcome', { outcome });
    if (requestId) builder.andWhere('audit.requestId ILIKE :requestId', { requestId: `%${requestId.trim()}%` });
    if (dateFrom) builder.andWhere('audit.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) builder.andWhere('audit.createdAt <= :dateTo', { dateTo: this.endOfDay(dateTo) });
    const [items, total] = await builder.orderBy('audit.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items: items.map((item) => ({ ...item, actorType: item.actorType === AuditActorType.System ? AuditActorType.System : AuditActorType.User })), total, page, pageSize };
  }

  async listUserPage({ identity, name, email, role, coderUsername, createdFrom, createdTo, page, pageSize }: UserCmsQueryDto): Promise<CmsPage<User>> {
    const builder = this.userRepository.createQueryBuilder('user');
    if (identity) builder.andWhere(new Brackets((where) => where
      .where('user.name ILIKE :identity', { identity: `%${identity.trim()}%` })
      .orWhere('user.email ILIKE :identity', { identity: `%${identity.trim()}%` })));
    if (name) builder.andWhere('user.name ILIKE :name', { name: `%${name.trim()}%` });
    if (email) builder.andWhere('user.email ILIKE :email', { email: `%${email.trim()}%` });
    if (role) builder.andWhere('user.role = :role', { role });
    if (coderUsername) builder.andWhere('user.coderUsername ILIKE :coderUsername', { coderUsername: `%${coderUsername.trim()}%` });
    if (createdFrom) builder.andWhere('user.createdAt >= :createdFrom', { createdFrom });
    if (createdTo) builder.andWhere('user.createdAt <= :createdTo', { createdTo: this.endOfDay(createdTo) });
    const [items, total] = await builder.orderBy('user.name', 'ASC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { items, total, page, pageSize };
  }

  async listRoles(): Promise<RoleSummary[]> {
    const [members, administrators] = await Promise.all([
      this.userRepository.countBy({ role: UserRole.Member }),
      this.userRepository.countBy({ role: UserRole.Administrator }),
    ]);
    return [
      { role: UserRole.Administrator, description: 'Manages projects, users, configuration, lifecycle, and audit history.', userCount: administrators },
      { role: UserRole.Member, description: 'Creates and manages only their own projects.', userCount: members },
    ];
  }

  async updateUserRole(actor: AdministratorActor, userId: string, role: UserRole, requestId: string | null = null): Promise<User> {
    return this.userRepository.manager.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('vibe-final-administrator'))");
      const users = manager.getRepository(User);
      const currentActor = await users.findOneBy({ id: actor.id });
      if (!currentActor || currentActor.role !== UserRole.Administrator) throw new ConflictException('Administrator permission changed; sign in again');
      const user = await users.findOneBy({ id: userId });
      if (!user) throw new NotFoundException('User not found');
      if (user.role === UserRole.Administrator && role !== UserRole.Administrator) {
        const administratorCount = await users.countBy({ role: UserRole.Administrator });
        if (administratorCount <= 1) throw new ConflictException('The final Administrator account cannot be demoted');
      }
      const previousRole = user.role;
      user.role = role;
      const updated = await users.save(user);
      const auditRepository = manager.getRepository(AuditLog);
      await auditRepository.save(auditRepository.create({ actorUser: { id: actor.id } as User, actorType: AuditActorType.User, actorRole: actor.role, action: 'USER_ROLE_UPDATED', resourceType: 'User', resourceId: user.id, project: null, outcome: AuditOutcome.Success, requestId, metadata: { previousRole, role } }));
      return updated;
    });
  }

  async createProject(actor: AdministratorActor, dto: AdminCreateProjectDto, idempotencyKey?: string, requestId: string | null = null): Promise<Project> {
    const project = await this.projectsService.create(dto.ownerId, { name: dto.name, description: dto.description }, idempotencyKey, requestId);
    await this.auditService.recordCompletion({ actorUserId: actor.id, actorType: AuditActorType.User, actorRole: actor.role, action: 'PROJECT_CREATE_RESOLVED_FOR_USER', resourceType: 'Project', resourceId: project.id, projectId: project.id, outcome: AuditOutcome.Success, requestId, metadata: { ownerId: dto.ownerId, idempotent: Boolean(idempotencyKey) } });
    return project;
  }

  setProjectLifecycle(projectId: string, status: ProjectStatus, requestId: string | null = null): Promise<Project> { return this.projectsService.setLifecycleForAdministrator(projectId, status, requestId); }
  deleteProject(projectId: string, requestId: string | null = null): Promise<Project> { return this.projectsService.deleteForAdministrator(projectId, requestId); }

  private validateValue(item: ConfigurationItem, value: string): string {
    const trimmed = value.trim();
    if (item.valueType === ConfigurationValueType.Number) {
      if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(Number(trimmed))) throw new BadRequestException('Configuration value must be a whole number');
      const parsed = Number(trimmed);
      if ((item.minimum !== null && parsed < item.minimum) || (item.maximum !== null && parsed > item.maximum)) throw new BadRequestException(`Configuration value must be between ${item.minimum ?? '-∞'} and ${item.maximum ?? '∞'}`);
      return String(parsed);
    }
    if (item.valueType === ConfigurationValueType.Boolean) {
      if (trimmed !== 'true' && trimmed !== 'false') throw new BadRequestException('Configuration value must be true or false');
      return trimmed;
    }
    if (!trimmed) throw new BadRequestException('Configuration value cannot be empty');
    return trimmed;
  }

  private endOfDay(value: string): string {
    return value.length === 10 ? `${value}T23:59:59.999Z` : value;
  }

  private async attachSafeConfigurationValues(items: ConfigurationItem[]): Promise<void> {
    if (items.length === 0) return;
    const publicIds = items.filter((item) => !item.isSensitive).map((item) => item.id);
    const publicValues = publicIds.length === 0 ? [] : await this.configurationRepository.createQueryBuilder('item').select(['item.id']).addSelect('item.value').where('item.id IN (:...ids)', { ids: publicIds }).getMany();
    const values = new Map(publicValues.map((item) => [item.id, item.value]));
    items.forEach((item) => { item.value = item.isSensitive ? '••••••••' : values.get(item.id) || ''; });
  }
}
