export type RequestStatus = 'Open' | 'In Progress' | 'Done';

export type WorkspaceRecord = {
  workspaceId: string;
  sourceRepository: string | null;
  currentCommit: string | null;
  workspaceUrl: string | null;
  frontendPreviewUrl?: string | null;
  apiPreviewUrl?: string | null;
};

export type RequestRecord = {
  id: string;
  title: string;
  description: string | null;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type RequestInput = { title: string; description?: string };

export type WorkspaceSnapshot = {
  workspaceId: string;
  lifecycleStatus?: 'Creating' | 'Running' | 'Stopped' | 'Failed';
  currentCommit: string | null;
  sourceFiles: string[];
  applicationDataFile: string;
  codeServerUrl: string | null;
};
