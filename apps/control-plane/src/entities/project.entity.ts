import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { Template } from './template.entity';
import { User } from './user.entity';

export enum ProjectStatus {
  Creating = 'Creating',
  Starting = 'Starting',
  Running = 'Running',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Deleting = 'Deleting',
  Deleted = 'Deleted',
  Failed = 'Failed',
}

@Entity('projects')
@Index(['owner', 'name'], { unique: true, where: '"deletedAt" IS NULL' })
@Index(['owner', 'idempotencyKey'], { unique: true, where: '"idempotencyKey" IS NOT NULL' })
@Index(['owner', 'status'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.projects, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @ManyToOne(() => Template, (template) => template.projects, { nullable: false })
  @JoinColumn({ name: 'templateId' })
  template!: Template;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.Creating })
  status!: ProjectStatus;

  @Column({ length: 120 })
  workspaceId!: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  workspaceUrl!: string | null;

  @Column({ length: 250 })
  frontendPreviewUrl!: string;

  @Column({ length: 250 })
  apiPreviewUrl!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  sourceRepository!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  currentCommit!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lastKnownError!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastOpenedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  provisioningStartedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  provisionedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  stoppedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  statusChangedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
