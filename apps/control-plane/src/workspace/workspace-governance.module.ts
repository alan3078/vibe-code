import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { ConfigurationModule } from '../configuration/configuration.module';
import { Project } from '../entities/project.entity';
import { WorkspaceModule } from './workspace.module';
import { WorkspaceGovernanceService } from './workspace-governance.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), WorkspaceModule, ConfigurationModule, AuditModule],
  providers: [WorkspaceGovernanceService],
})
export class WorkspaceGovernanceModule {}
