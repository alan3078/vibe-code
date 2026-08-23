import { InitialPlatformSchema1726963200000 } from './1726963200000-initial-platform-schema';

describe('InitialPlatformSchema migration', () => {
  it('creates the grouped configuration key index and rolls legacy actor storage back cleanly', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const runner = { query };
    const migration = new InitialPlatformSchema1726963200000();

    await migration.up(runner as never);
    expect(query).toHaveBeenCalledWith('CREATE UNIQUE INDEX configuration_items_group_key ON configuration_items ("groupId", key)');

    query.mockClear();
    await migration.down(runner as never);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('audit_logs_actortype_enum'));
  });
});
