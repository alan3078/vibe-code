import { AdminService } from './admin.service';
import { ConfigurationValueType } from '../entities/configuration-item.entity';
import { UserRole } from '../entities/user.entity';

describe('AdminService', () => {
  it('allows an administrator to update a mutable bounded configuration item and records the change', async () => {
    const item = {
      id: 'config-1', key: 'workspace.max_active_per_user', value: '1', valueType: ConfigurationValueType.Number,
      minimum: 1, maximum: 10, isMutable: true, isSensitive: false,
    };
    const configurationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        addSelect: jest.fn().mockReturnThis(), leftJoinAndSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(item),
      }),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const auditRepository = { create: jest.fn().mockImplementation((value) => value), save: jest.fn().mockImplementation(async (value) => value) };
    const manager = { getRepository: jest.fn((entity) => entity.name === 'ConfigurationItem' ? configurationRepository : auditRepository) };
    const rootConfigurationRepository = { manager: { transaction: jest.fn().mockImplementation(async (callback) => callback(manager)) } };
    const service = new AdminService(
      {} as never,
      {} as never,
      rootConfigurationRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.updateConfiguration({ id: 'admin-1', role: UserRole.Administrator }, item.key, '2');

    expect(result.value).toBe('2');
    expect(configurationRepository.save).toHaveBeenCalledWith(item);
    expect(auditRepository.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'CONFIGURATION_UPDATED', resourceId: item.key }));
  });

  it('revalidates the acting administrator inside the serialized role transaction', async () => {
    const transactionalUsers = { findOneBy: jest.fn().mockResolvedValue({ id: 'admin-1', role: UserRole.Member }) };
    const manager = { query: jest.fn().mockResolvedValue([]), getRepository: jest.fn().mockReturnValue(transactionalUsers) };
    const userRepository = { manager: { transaction: jest.fn().mockImplementation(async (callback) => callback(manager)) } };
    const service = new AdminService({} as never, userRepository as never, {} as never, {} as never, {} as never, {} as never, {} as never);

    await expect(service.updateUserRole({ id: 'admin-1', role: UserRole.Administrator }, 'admin-1', UserRole.Administrator)).rejects.toThrow('permission changed');
    expect(transactionalUsers.findOneBy).toHaveBeenCalledTimes(1);
  });

  it('prevents demoting the final administrator', async () => {
    const transactionalUsers = {
      findOneBy: jest.fn().mockResolvedValue({ id: 'admin-1', role: UserRole.Administrator }),
      countBy: jest.fn().mockResolvedValue(1),
    };
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn().mockReturnValue(transactionalUsers),
    };
    const userRepository = { manager: { transaction: jest.fn().mockImplementation(async (callback) => callback(manager)) } };
    const service = new AdminService(
      {} as never,
      userRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { record: jest.fn().mockResolvedValue({}) } as never,
    );

    await expect(service.updateUserRole({ id: 'admin-1', role: UserRole.Administrator }, 'admin-1', UserRole.Member)).rejects.toThrow('final Administrator');
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'));
  });

  it('redacts sensitive nested configuration values while loading only public values', async () => {
    const sensitive = { id: 'secret-1', key: 'secret.key', value: 'must-not-leave-api', isSensitive: true };
    const publicItem = { id: 'public-1', key: 'public.key', isSensitive: false };
    const group = { id: 'group-1', key: 'workspace', items: [sensitive, publicItem] };
    const groupBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[group], 1]),
    };
    const valueBuilder = {
      select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'public-1', value: 'visible' }]),
    };
    const service = new AdminService(
      {} as never,
      {} as never,
      { createQueryBuilder: jest.fn().mockReturnValue(valueBuilder) } as never,
      { createQueryBuilder: jest.fn().mockReturnValue(groupBuilder) } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.listConfigurationGroupPage({ page: 1, pageSize: 20 });

    expect(result.items[0].items[0].value).toBe('••••••••');
    expect(result.items[0].items[1].value).toBe('visible');
    expect(valueBuilder.where).toHaveBeenCalledWith('item.id IN (:...ids)', { ids: ['public-1'] });
    expect(JSON.stringify(result)).not.toContain('must-not-leave-api');
  });

  it('returns an administrator-created project when completion evidence needs reconciliation', async () => {
    const project = { id: 'project-1', name: 'Admin app' };
    const projects = { create: jest.fn().mockResolvedValue(project) };
    const audit = { recordCompletion: jest.fn().mockResolvedValue(null) };
    const service = new AdminService({} as never, {} as never, {} as never, {} as never, {} as never, projects as never, audit as never);

    await expect(service.createProject(
      { id: 'admin-1', role: UserRole.Administrator },
      { ownerId: 'user-1', name: 'Admin app' },
      'retry-key',
      'request-1',
    )).resolves.toBe(project);
    expect(audit.recordCompletion).toHaveBeenCalledWith(expect.objectContaining({ action: 'PROJECT_CREATE_RESOLVED_FOR_USER' }));
  });
});
