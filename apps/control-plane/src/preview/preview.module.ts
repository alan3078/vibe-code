import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { PreviewController } from './preview.controller';
import { WorkspaceController } from '../workspace/workspace.controller';

@Module({
  imports: [AuthModule, ProjectsModule, WorkspaceModule],
  controllers: [PreviewController, WorkspaceController],
})
export class PreviewModule {}
