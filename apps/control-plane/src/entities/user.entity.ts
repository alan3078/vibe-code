import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Project } from './project.entity';

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

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Project, (project) => project.owner)
  projects!: Project[];
}
