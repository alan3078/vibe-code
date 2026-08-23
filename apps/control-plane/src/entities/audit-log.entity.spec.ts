import { getMetadataArgsStorage } from 'typeorm';
import { AuditLog } from './audit-log.entity';

describe('AuditLog PostgreSQL metadata', () => {
  it('declares nullable audit identifiers as varchar rather than reflected Object types', () => {
    const columns = getMetadataArgsStorage().columns.filter((column) => column.target === AuditLog);
    expect(columns.find((column) => column.propertyName === 'resourceId')?.options.type).toBe('varchar');
    expect(columns.find((column) => column.propertyName === 'requestId')?.options.type).toBe('varchar');
  });

  it('keeps legacy actor values storage-compatible while the public model is User or System', () => {
    const columns = getMetadataArgsStorage().columns.filter((column) => column.target === AuditLog);
    expect(columns.find((column) => column.propertyName === 'actorType')?.options.enum).toEqual([
      'User',
      'System',
      'Member',
      'Administrator',
    ]);
  });
});
