import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { Template } from './template.entity';
import { User } from './user.entity';

export enum ProjectStatus {
  Creating = 'Creating',
  Running = 'Running',
  Stopped = 'Stopped',
  Failed = 'Failed',
}

@Entity('projects')
@Index(['owner', 'name'], { unique: true })
@Index(['owner', 'idempotencyKey'], { unique: true, where: '"idempotencyKey" IS NOT NULL' })
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
}
