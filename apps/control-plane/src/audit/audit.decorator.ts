import { SetMetadata } from '@nestjs/common';

export const AUDIT_EVENT = 'audit-event';

export type AuditMetadata = {
  action: string;
  resourceType: string;
};

export const Audit = (action: string, resourceType: string) => SetMetadata(AUDIT_EVENT, { action, resourceType } satisfies AuditMetadata);
