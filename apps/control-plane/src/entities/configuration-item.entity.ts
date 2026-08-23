import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ConfigurationGroup } from './configuration-group.entity';

export enum ConfigurationValueType {
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',
}

@Entity('configuration_items')
@Index(['group', 'key'], { unique: true })
@Check('"key" ~ \'^[a-z][a-z0-9_.-]*$\'')
export class ConfigurationItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ConfigurationGroup, (group) => group.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group!: ConfigurationGroup;

  @Column({ unique: true, length: 160 })
  key!: string;

  @Column({ length: 160 })
  displayName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: ConfigurationValueType })
  valueType!: ConfigurationValueType;

  @Column({ type: 'text', select: false })
  value!: string;

  @Column({ type: 'int', nullable: true })
  minimum!: number | null;

  @Column({ type: 'int', nullable: true })
  maximum!: number | null;

  @Column({ default: false })
  isSensitive!: boolean;

  @Column({ default: true })
  isMutable!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
