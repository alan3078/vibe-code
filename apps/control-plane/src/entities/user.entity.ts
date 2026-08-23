import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Project } from './project.entity';

export enum UserRole {
  Member = 'Member',
  Administrator = 'Administrator',
}

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ unique: true, length: 200 })
  email!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  coderUsername!: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.Member })
  role!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Project, (project) => project.owner)
  projects!: Project[];
}
