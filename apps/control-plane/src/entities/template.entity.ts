import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('templates')
export class Template {
  @PrimaryColumn({ length: 100 })
  id!: string;

  @Column({ length: 160 })
  name!: string;

  @Column({ length: 30 })
  version!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Project, (project) => project.template)
  projects!: Project[];
}
