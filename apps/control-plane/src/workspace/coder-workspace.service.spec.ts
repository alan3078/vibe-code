import { CoderWorkspaceService } from './coder-workspace.service';

describe('CoderWorkspaceService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CODER_BASE_URL = 'https://coder.example.test';
    process.env.CODER_TOKEN = 'test-token';
    process.env.CODER_TEMPLATE_ID = 'template-1';
    process.env.CODER_TEMPLATE_VERSION_ID = 'version-1';
    process.env.CODER_OWNER = 'alice';
    process.env.CODER_GIT_REMOTE_URL = 'https://git.example.test/vibe/request-tracker.git';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('maps the Coder workspace build and agent state to a running lifecycle state', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'workspace-1',
      name: 'vibe-project-1',
      latest_build: {
        status: 'succeeded',
        transition: 'start',
        resources: [{ agents: [{ lifecycle_state: 'ready' }] }],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const snapshot = await new CoderWorkspaceService().describe('workspace-1', 'jamie');

    expect(snapshot.lifecycleStatus).toBe('Running');
    expect(snapshot.codeServerUrl).toBe('https://coder.example.test/@/jamie/vibe-project-1/apps/code-server/');
  });

  it('requests lifecycle changes by creating a Coder workspace build', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const service = new CoderWorkspaceService();

    await service.start('workspace-1');
    await service.stop('workspace-1');

    const calls = fetchMock.mock.calls as Array<[string | URL, RequestInit]>;
    expect(String(calls[0][0])).toBe('https://coder.example.test/api/v2/workspaces/workspace-1/builds');
    expect(JSON.parse(String(calls[0][1].body))).toEqual({ transition: 'start' });
    expect(JSON.parse(String(calls[1][1].body))).toEqual({ transition: 'stop' });
  });

  it('reports the configured Git repository in the workspace mapping', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'workspace-2', name: 'vibe-project-2' }), { status: 200 }));

    const workspace = await new CoderWorkspaceService().provision('project-2', 'Request Tracker', 'jamie');

    expect(workspace.sourceRepository).toBe('https://git.example.test/vibe/request-tracker.git');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[1] as [string, RequestInit];
    expect(url).toBe('https://coder.example.test/api/v2/organizations/default/members/jamie/workspaces');
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'vibe-project-2',
      template_version_id: 'version-1',
      rich_parameter_values: [{ name: 'project_name', value: 'Request Tracker' }],
    });
  });

  it('uses the template ID when no pinned template version is configured', async () => {
    delete process.env.CODER_TEMPLATE_VERSION_ID;
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'workspace-3', name: 'vibe-project-3' }), { status: 200 }));

    await new CoderWorkspaceService().provision('project-3', 'Tracker', 'jamie');

    const [, init] = (global.fetch as jest.Mock).mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.template_id).toBe('template-1');
    expect(body.template_version_id).toBeUndefined();
  });

  it('reuses the deterministic Coder workspace after a control-plane restart', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'workspace-existing', name: 'vibe-project-recover' }), { status: 200 }));

    const workspace = await new CoderWorkspaceService().provision('project-recover', 'Recovered', 'jamie');

    expect(workspace.workspaceId).toBe('workspace-existing');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
