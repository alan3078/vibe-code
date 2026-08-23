import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './project.entity';
import { User, UserRole } from './user.entity';

export enum AuditActorType {
  User = 'User',
  System = 'System',
}

// Development synchronize must be able to open databases created before actor
// semantics were normalized. The API only accepts/emits AuditActorType above;
// the production migration converts this legacy-compatible storage to varchar.
const auditActorStorageValues = ['User', 'System', 'Member', 'Administrator'] as const;

export enum AuditOutcome {
  Success = 'Success',
  Failure = 'Failure',
}

@Entity('audit_logs')
@Index(['createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['requestId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser!: User | null;

  @Column({ type: 'enum', enum: auditActorStorageValues, enumName: 'audit_logs_actortype_enum' })
  actorType!: AuditActorType;

  @Column({ type: 'enum', enum: UserRole, nullable: true })
  actorRole!: UserRole | null;

  @Column({ length: 120 })
  action!: string;

  @Column({ length: 80 })
  resourceType!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  resourceId!: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'projectId' })
  project!: Project | null;

  @Column({ type: 'enum', enum: AuditOutcome })
  outcome!: AuditOutcome;

  @Column({ type: 'varchar', length: 120, nullable: true })
  requestId!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
