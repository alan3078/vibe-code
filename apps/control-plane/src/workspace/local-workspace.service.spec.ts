import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as nodeFs from 'node:fs';
import * as git from 'isomorphic-git';
import { LocalWorkspaceService } from './local-workspace.service';

describe('LocalWorkspaceService', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'vibe-workspace-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('provisions isolated source, SQLite data, and an initial Git commit', async () => {
    const service = new LocalWorkspaceService(root);

    const workspace = await service.provision('project-1', 'Request Tracker');

    expect(workspace.workspaceId).toBe('local-project-1');
    expect(workspace.sourceRepository).toBe('local://project-1');
    expect(workspace.currentCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(workspace.workspaceUrl).toBe('http://localhost:8080/?folder=/workspaces/local-project-1/source');
    const snapshot = await service.describe(workspace.workspaceId);
    expect(snapshot.sourceFiles).toEqual(expect.arrayContaining(['backend', 'frontend']));
    expect(snapshot.sourceFiles).toContain('.clinerules');
    expect(snapshot.sourceFiles).toContain('.github');
    expect(snapshot.sourceFiles).not.toContain('main.py');
    await expect(readFile(join(root, workspace.workspaceId, 'source', '.github', 'skills', 'implementation-minimality', 'SKILL.md'), 'utf8'))
      .resolves.toContain('Implementation Minimality');
    await expect(readFile(join(root, workspace.workspaceId, 'source', '.github', 'skills', 'visual-browser-qa', 'SKILL.md'), 'utf8'))
      .resolves.toContain('Visual Browser QA');
    await expect(git.listFiles({ fs: nodeFs, dir: join(root, workspace.workspaceId, 'source') }))
      .resolves.toEqual(expect.arrayContaining([
        '.github/skills/implementation-minimality/SKILL.md',
        '.github/skills/visual-browser-qa/SKILL.md',
      ]));
    await expect(service.listRequests(workspace.workspaceId)).resolves.toEqual([]);
  });

  it('preserves application records when a stopped workspace is reopened', async () => {
    const firstRun = new LocalWorkspaceService(root);
    const workspace = await firstRun.provision('project-2', 'Requests');
    const created = await firstRun.createRequest(workspace.workspaceId, { title: 'Approve access', description: 'Review the request' });
    await firstRun.stop(workspace.workspaceId);

    const secondRun = new LocalWorkspaceService(root);
    await secondRun.start(workspace.workspaceId);
    const records = await secondRun.listRequests(workspace.workspaceId);

    expect(records).toEqual([{ ...created, status: 'Open' }]);
  });

  it('does not recreate a deleted workspace when it is queried or stopped', async () => {
    const service = new LocalWorkspaceService(root);
    const workspace = await service.provision('deleted-project', 'Deleted project');
    await service.delete(workspace.workspaceId);

    await expect(service.listRequests(workspace.workspaceId)).rejects.toThrow('Workspace not found');
    await expect(service.stop(workspace.workspaceId)).rejects.toThrow('Workspace not found');
    expect(nodeFs.existsSync(join(root, workspace.workspaceId))).toBe(false);
  });

  it('repairs a missing source tree when a persisted workspace is resumed', async () => {
    const service = new LocalWorkspaceService(root);
    const workspace = await service.provision('project-repair', 'Repair Test');
    await rm(join(root, workspace.workspaceId, 'source'), { recursive: true, force: true });

    await service.start(workspace.workspaceId);
    const snapshot = await service.describe(workspace.workspaceId);

    expect(snapshot.sourceFiles).toEqual(expect.arrayContaining(['backend', 'frontend', 'README.md']));
    expect(snapshot.currentCommit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('recreates the source tree from the recorded Git commit', async () => {
    const service = new LocalWorkspaceService(root);
    const workspace = await service.provision('project-3', 'Recovery Test');

    const restoredCommit = await service.restoreFromGit(workspace.workspaceId);

    expect(restoredCommit).toBe(workspace.currentCommit);
    const snapshot = await service.describe(workspace.workspaceId);
    expect(snapshot.sourceFiles).toEqual(expect.arrayContaining(['backend', 'frontend', 'workspace.json']));
  });

  it('refreshes Git recovery to the latest committed source version', async () => {
    const service = new LocalWorkspaceService(root);
    const workspace = await service.provision('project-4', 'Latest Commit');
    const sourcePath = join(root, workspace.workspaceId, 'source');

    await writeFile(join(sourcePath, 'README.md'), '# Latest committed change\n');
    await git.add({ fs: nodeFs, dir: sourcePath, filepath: 'README.md' });
    const latestCommit = await git.commit({
      fs: nodeFs,
      dir: sourcePath,
      message: 'Apply generated-app change',
      author: { name: 'Vibe Code Platform', email: 'platform@localhost.test' },
    });
    await service.describe(workspace.workspaceId);
    await rm(sourcePath, { recursive: true, force: true });

    await expect(service.restoreFromGit(workspace.workspaceId)).resolves.toBe(latestCommit);
    await expect(readFile(join(sourcePath, 'README.md'), 'utf8')).resolves.toContain('Latest committed change');
  });
});
