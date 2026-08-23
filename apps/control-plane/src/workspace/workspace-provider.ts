import { RequestInput, RequestRecord, RequestStatus, WorkspaceRecord, WorkspaceSnapshot } from './workspace-types';

export const WORKSPACE_PROVIDER = 'WORKSPACE_PROVIDER';

export interface WorkspaceProvider {
  provision(projectId: string, projectName: string, owner?: string): Promise<WorkspaceRecord>;
  start(workspaceId: string): Promise<void>;
  stop(workspaceId: string): Promise<void>;
  delete(workspaceId: string): Promise<void>;
  describe(workspaceId: string, owner?: string): Promise<WorkspaceSnapshot>;
  createRequest(workspaceId: string, input: RequestInput): Promise<RequestRecord>;
  listRequests(workspaceId: string): Promise<RequestRecord[]>;
  updateRequest(workspaceId: string, requestId: string, status: RequestStatus): Promise<RequestRecord>;
}
