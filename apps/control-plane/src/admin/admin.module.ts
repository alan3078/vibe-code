import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLog } from '../entities/audit-log.entity';
import { ConfigurationItem } from '../entities/configuration-item.entity';
import { ConfigurationGroup } from '../entities/configuration-group.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { ProjectsModule } from '../projects/projects.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, User, ConfigurationGroup, ConfigurationItem, AuditLog]), AuthModule, AuditModule, ProjectsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
