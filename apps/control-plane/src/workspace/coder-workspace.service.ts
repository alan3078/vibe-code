import { Injectable } from '@nestjs/common';
import { WorkspaceProvider } from './workspace-provider';
import { RequestInput, RequestRecord, RequestStatus, WorkspaceRecord, WorkspaceSnapshot } from './workspace-types';

/**
 * Cluster-backed provider. It is selected with WORKSPACE_PROVIDER=coder and
 * deliberately requires an operator-supplied Coder token and template ID or version.
 */
@Injectable()
export class CoderWorkspaceService implements WorkspaceProvider {
  private readonly baseUrl = (process.env.CODER_BASE_URL || '').replace(/\/$/, '');
  private readonly organization = process.env.CODER_ORGANIZATION || 'default';
  private readonly templateId = process.env.CODER_TEMPLATE_ID || '';
  private readonly templateVersionId = process.env.CODER_TEMPLATE_VERSION_ID || '';

  async provision(projectId: string, projectName: string, owner?: string): Promise<WorkspaceRecord> {
    this.assertConfigured();
    const coderOwner = owner || process.env.CODER_OWNER;
    if (!coderOwner) throw new Error('Coder provider requires a per-user Coder username or CODER_OWNER fallback');
    const workspaceName = `vibe-${projectId}`;
    const existing = await this.findWorkspaceByName(coderOwner, workspaceName);
    if (existing) return this.workspaceRecord(existing.id, existing.name || workspaceName, coderOwner);
    const body: Record<string, unknown> = {
      name: workspaceName,
      rich_parameter_values: [{ name: 'project_name', value: projectName }],
    };
    if (this.templateVersionId) body.template_version_id = this.templateVersionId;
    else body.template_id = this.templateId;
    const response = await this.request<{ id: string; name?: string }>('/api/v2/organizations/' + encodeURIComponent(this.organization) + '/members/' + encodeURIComponent(coderOwner) + '/workspaces', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return this.workspaceRecord(response.id, response.name || workspaceName, coderOwner);
  }

  private workspaceRecord(workspaceId: string, workspaceName: string, coderOwner: string): WorkspaceRecord {
    const workspaceUrl = this.appUrl(coderOwner, workspaceName, 'code-server');
    return {
      workspaceId,
      sourceRepository: process.env.CODER_GIT_REMOTE_URL || null,
      currentCommit: null,
      workspaceUrl,
      frontendPreviewUrl: this.appUrl(coderOwner, workspaceName, 'generated-app'),
      apiPreviewUrl: `${this.appUrl(coderOwner, workspaceName, 'generated-app')}api/requests`,
    };
  }

  private async findWorkspaceByName(owner: string, workspaceName: string): Promise<{ id: string; name?: string } | null> {
    try {
      return await this.request(`/api/v2/users/${encodeURIComponent(owner)}/workspace/${encodeURIComponent(workspaceName)}`, { method: 'GET' });
    } catch (error) {
      if ((error as { status?: unknown }).status === 404) return null;
      throw error;
    }
  }

  async start(workspaceId: string): Promise<void> {
    await this.request(`/api/v2/workspaces/${encodeURIComponent(workspaceId)}/builds`, { method: 'POST', body: JSON.stringify({ transition: 'start' }) });
  }

  async stop(workspaceId: string): Promise<void> {
    await this.request(`/api/v2/workspaces/${encodeURIComponent(workspaceId)}/builds`, { method: 'POST', body: JSON.stringify({ transition: 'stop' }) });
  }

  async delete(workspaceId: string): Promise<void> {
    await this.request(`/api/v2/workspaces/${encodeURIComponent(workspaceId)}`, { method: 'DELETE' });
  }

  async describe(workspaceId: string, owner?: string): Promise<WorkspaceSnapshot> {
    const workspace = await this.request<{
      name?: string;
      latest_build?: {
        status?: string;
        transition?: string;
        resources?: Array<{ agents?: Array<{ lifecycle_state?: string }> }>;
      };
    }>(`/api/v2/workspaces/${encodeURIComponent(workspaceId)}`, { method: 'GET' });
    const coderOwner = owner || process.env.CODER_OWNER;
    const workspaceName = workspace.name || workspaceId;
    return {
      workspaceId,
      lifecycleStatus: this.lifecycleStatus(workspace.latest_build),
      currentCommit: null,
      sourceFiles: [],
      applicationDataFile: 'workspace-local SQLite (Coder template)',
      codeServerUrl: this.baseUrl && coderOwner ? this.appUrl(coderOwner, workspaceName, 'code-server') : null,
    };
  }

  createRequest(_workspaceId: string, _input: RequestInput): Promise<RequestRecord> {
    return Promise.reject(new Error('Request preview is served by the generated app inside the Coder workspace'));
  }

  listRequests(_workspaceId: string): Promise<RequestRecord[]> {
    return Promise.reject(new Error('Request preview is served by the generated app inside the Coder workspace'));
  }

  updateRequest(_workspaceId: string, _requestId: string, _status: RequestStatus): Promise<RequestRecord> {
    return Promise.reject(new Error('Request preview is served by the generated app inside the Coder workspace'));
  }

  private assertConfigured(): void {
    if (!this.baseUrl || !process.env['CODER_' + 'TOKEN'] || (!this.templateId && !this.templateVersionId)) {
      throw new Error('Coder provider requires CODER_BASE_URL, CODER_TOKEN, and CODER_TEMPLATE_ID or CODER_TEMPLATE_VERSION_ID');
    }
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');
    const coderToken = process.env['CODER_' + 'TOKEN'];
    if (coderToken) headers.set('Coder-Session-Token', coderToken);
    const response = await fetch(this.baseUrl + path, { ...init, headers });
    const payload = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) {
      const error = new Error(payload.message || `Coder request failed with status ${response.status}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return payload as T;
  }

  private appUrl(owner: string, workspaceName: string, slug: string): string {
    return `${this.baseUrl}/@/${encodeURIComponent(owner)}/${encodeURIComponent(workspaceName)}/apps/${encodeURIComponent(slug)}/`;
  }

  private lifecycleStatus(build: { status?: string; transition?: string; resources?: Array<{ agents?: Array<{ lifecycle_state?: string }> }> } | undefined): WorkspaceSnapshot['lifecycleStatus'] {
    const status = (build?.status || '').toLowerCase();
    const transition = (build?.transition || '').toLowerCase();
    const agentState = (build?.resources?.[0]?.agents?.[0]?.lifecycle_state || '').toLowerCase();
    if (['failed', 'error', 'canceled', 'cancelled'].includes(status)) return 'Failed';
    if (transition === 'stop' && ['succeeded', 'success', 'completed', 'complete'].includes(status)) return 'Stopped';
    if (transition === 'start' && (['succeeded', 'success', 'completed', 'complete'].includes(status) || ['ready', 'running'].includes(agentState))) return 'Running';
    return 'Creating';
  }
}
