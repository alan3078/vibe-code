import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditActorType, AuditLog, AuditOutcome } from '../entities/audit-log.entity';
import { Project } from '../entities/project.entity';
import { User, UserRole } from '../entities/user.entity';

export type AuditEventInput = {
  actorUserId?: string | null;
  actorType: AuditActorType;
  actorRole: UserRole | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  projectId?: string | null;
  outcome: AuditOutcome;
  requestId: string | null;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly auditRepository: Repository<AuditLog>) {}

  async record(input: AuditEventInput): Promise<AuditLog> {
    return this.auditRepository.save(this.auditRepository.create({
      actorUser: input.actorUserId ? ({ id: input.actorUserId } as User) : null,
      actorType: input.actorType,
      actorRole: input.actorRole,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      project: input.projectId ? ({ id: input.projectId } as Project) : null,
      outcome: input.outcome,
      requestId: input.requestId,
      metadata: input.metadata || {},
    }));
  }

  async recordCompletion(input: AuditEventInput): Promise<AuditLog | null> {
    try {
      return await this.record(input);
    } catch (error) {
      // The matching *_REQUESTED event is already durable. Completion evidence
      // can be reconciled without misreporting a successful provider operation.
      console.error('Unable to persist audit completion event', error);
      return null;
    }
  }
}
