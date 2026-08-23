export type ProjectStatus = 'Creating' | 'Running' | 'Stopped' | 'Failed';

export type User = { id: string; name: string; email: string };
export type Template = { id: string; name: string; version: string };
export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  workspaceId: string;
  workspaceUrl: string | null;
  frontendPreviewUrl: string;
  apiPreviewUrl: string;
  sourceRepository: string | null;
  currentCommit: string | null;
  lastKnownError: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
  template: Template;
};

export type RequestRecord = {
  id: string;
  title: string;
  description: string | null;
  status: 'Open' | 'In Progress' | 'Done';
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceSnapshot = {
  workspaceId: string;
  currentCommit: string;
  sourceFiles: string[];
  applicationDataFile: string;
  codeServerUrl: string | null;
};

export class ApiError extends Error {
  constructor(message: string, readonly requestId?: string, readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  const sessionValue = sessionStorage.getItem('vibe-token');
  if (sessionValue) headers.set('authorization', `Bearer ${sessionValue}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const requestId = response.headers.get('x-request-id') || undefined;
  const payload = await response.json().catch(() => ({})) as { message?: unknown; requestId?: string };
  if (!response.ok) {
    const message = Array.isArray(payload.message)
      ? payload.message.filter((item): item is string => typeof item === 'string').join('; ')
      : typeof payload.message === 'string' ? payload.message : 'The control plane is unavailable.';
    throw new ApiError(message || 'The control plane is unavailable.', payload.requestId || requestId, response.status);
  }
  return payload as T;
}

export const api = {
  demoLogin: (userId: string) => request<{ token: string; user: User }>('/auth/demo-login', { method: 'POST', body: JSON.stringify({ userId }) }),
  listProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (input: { name: string; description?: string }, idempotencyKey = crypto.randomUUID()) => request<Project>('/projects', {
    method: 'POST',
    headers: { 'idempotency-key': idempotencyKey },
    body: JSON.stringify(input),
  }),
  setLifecycle: (id: string, action: 'start' | 'stop') => request<Project>(`/projects/${id}/${action}`, { method: 'POST' }),
  describeWorkspace: (id: string) => request<WorkspaceSnapshot>(`/projects/${id}/workspace`),
  listRequests: (id: string) => request<RequestRecord[]>(`/preview/projects/${id}/requests`),
  createRequest: (id: string, input: { title: string; description?: string }) => request<RequestRecord>(`/preview/projects/${id}/requests`, { method: 'POST', body: JSON.stringify(input) }),
  updateRequest: (projectId: string, requestId: string, status: RequestRecord['status']) => request<RequestRecord>(`/preview/projects/${projectId}/requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export const seededUsers: User[] = [
  { id: '2b8a1f02-0fbb-4ccf-9b88-0f4d4ed1a101', name: 'Alex Chen', email: 'alex@example.test' },
  { id: '2b8a1f02-0fbb-4ccf-9b88-0f4d4ed1a102', name: 'Jamie Lee', email: 'jamie@example.test' },
];
