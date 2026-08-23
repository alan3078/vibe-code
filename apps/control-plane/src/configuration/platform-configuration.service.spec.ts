import { PlatformConfigurationService } from './platform-configuration.service';

describe('PlatformConfigurationService', () => {
  it('reads an administrator-managed numeric resource policy and rejects invalid values', async () => {
    const getOne = jest.fn().mockResolvedValue({ key: 'workspace.max_active_per_user', value: '2', valueType: 'number' });
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne,
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const service = new PlatformConfigurationService(repository as never);

    await expect(service.getPositiveInteger('workspace.max_active_per_user')).resolves.toBe(2);

    getOne.mockResolvedValueOnce({ key: 'workspace.max_active_per_user', value: 'zero', valueType: 'number' });
    await expect(service.getPositiveInteger('workspace.max_active_per_user')).rejects.toThrow('must be a positive integer');
  });
});
