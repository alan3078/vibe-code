export type ProjectStatus = 'Creating' | 'Starting' | 'Running' | 'Stopping' | 'Stopped' | 'Deleting' | 'Deleted' | 'Failed';

export type UserRole = 'Member' | 'Administrator';
export type User = { id: string; name: string; email: string; role?: UserRole; coderUsername?: string | null; createdAt?: string };
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
  lastActivityAt: string | null;
  provisionedAt: string | null;
  stoppedAt: string | null;
  createdAt: string;
  updatedAt: string;
  template: Template;
  owner?: Pick<User, 'id' | 'name' | 'email'>;
};

export type ConfigurationItem = {
  id: string;
  key: string;
  displayName: string;
  description: string | null;
  valueType: 'number' | 'boolean' | 'string';
  value: string;
  minimum: number | null;
  maximum: number | null;
  isSensitive: boolean;
  isMutable: boolean;
  group: { key: string; name: string };
};
export type ConfigurationGroup = { id: string; key: string; name: string; description: string | null; isActive: boolean; createdAt: string; updatedAt: string; items: ConfigurationItem[] };

export type AuditLog = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  outcome: 'Success' | 'Failure';
  createdAt: string;
  metadata: Record<string, unknown>;
  actorUser: { name: string; email: string } | null;
  actorType: string;
  actorRole: UserRole | null;
  project: { id: string; name: string } | null;
};

export type AdminOverview = { projects: number; creating: number; running: number; stopped: number; failed: number };
export type CmsPage<T> = { items: T[]; total: number; page: number; pageSize: number };
export type RoleSummary = { role: UserRole; description: string; userCount: number };
export type CmsFilters = Record<string, string | number | boolean | undefined>;

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

const cmsQuery = (filters: CmsFilters = {}, page = 1, pageSize = 20) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== '') params.set(key, String(value).trim());
  });
  return params.toString();
};

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
  deleteProject: (id: string) => request<Project>(`/projects/${id}`, { method: 'DELETE' }),
  describeWorkspace: (id: string) => request<WorkspaceSnapshot>(`/projects/${id}/workspace`),
  listRequests: (id: string) => request<RequestRecord[]>(`/preview/projects/${id}/requests`),
  createRequest: (id: string, input: { title: string; description?: string }) => request<RequestRecord>(`/preview/projects/${id}/requests`, { method: 'POST', body: JSON.stringify(input) }),
  updateRequest: (projectId: string, requestId: string, status: RequestRecord['status']) => request<RequestRecord>(`/preview/projects/${projectId}/requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  adminOverview: () => request<AdminOverview>('/admin/overview'),
  adminProjectPage: (filters?: CmsFilters, page?: number, pageSize?: number) => request<CmsPage<Project>>(`/admin/cms/projects?${cmsQuery(filters, page, pageSize)}`),
  adminCreateProject: (input: { ownerId: string; name: string; description?: string }, idempotencyKey: string = crypto.randomUUID()) => request<Project>('/admin/projects', { method: 'POST', headers: { 'idempotency-key': idempotencyKey }, body: JSON.stringify(input) }),
  adminSetLifecycle: (id: string, action: 'start' | 'stop') => request<Project>(`/admin/projects/${id}/${action}`, { method: 'POST' }),
  adminDeleteProject: (id: string) => request<Project>(`/admin/projects/${id}`, { method: 'DELETE' }),
  configurationGroupPage: (filters?: CmsFilters, page?: number, pageSize?: number) => request<CmsPage<ConfigurationGroup>>(`/admin/cms/configuration-groups?${cmsQuery(filters, page, pageSize)}`),
  configurationPage: (filters?: CmsFilters, page?: number, pageSize?: number) => request<CmsPage<ConfigurationItem>>(`/admin/cms/configuration?${cmsQuery(filters, page, pageSize)}`),
  updateConfiguration: (key: string, value: string) => request<ConfigurationItem>(`/admin/configuration/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify({ value }) }),
  auditPage: (filters?: CmsFilters, page?: number, pageSize?: number) => request<CmsPage<AuditLog>>(`/admin/cms/audit?${cmsQuery(filters, page, pageSize)}`),
  userPage: (filters?: CmsFilters, page?: number, pageSize?: number) => request<CmsPage<User>>(`/admin/cms/users?${cmsQuery(filters, page, pageSize)}`),
  listRoles: () => request<RoleSummary[]>('/admin/roles'),
  updateUserRole: (id: string, role: UserRole) => request<User>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
};

export const seededUsers: User[] = [
  { id: '2b8a1f02-0fbb-4ccf-9b88-0f4d4ed1a101', name: 'Alex Chen', email: 'alex@example.test', role: 'Member' },
  { id: '2b8a1f02-0fbb-4ccf-9b88-0f4d4ed1a102', name: 'Jamie Lee', email: 'jamie@example.test', role: 'Member' },
  { id: '2b8a1f02-0fbb-4ccf-9b88-0f4d4ed1a103', name: 'Avery Morgan', email: 'avery.admin@example.test', role: 'Administrator' },
];
