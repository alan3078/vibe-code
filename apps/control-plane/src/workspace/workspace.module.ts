import { Module } from '@nestjs/common';
import { LocalWorkspaceService } from './local-workspace.service';
import { CoderWorkspaceService } from './coder-workspace.service';
import { WORKSPACE_PROVIDER } from './workspace-provider';

@Module({
  providers: [
    LocalWorkspaceService,
    CoderWorkspaceService,
    {
      provide: WORKSPACE_PROVIDER,
      inject: [LocalWorkspaceService, CoderWorkspaceService],
      useFactory: (local: LocalWorkspaceService, coder: CoderWorkspaceService) => process.env.WORKSPACE_PROVIDER === 'coder' ? coder : local,
    },
  ],
  exports: [LocalWorkspaceService, CoderWorkspaceService, WORKSPACE_PROVIDER],
})
export class WorkspaceModule {}
