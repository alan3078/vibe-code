import { randomUUID } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import * as nodeFs from 'node:fs';
import { join, resolve } from 'node:path';
import * as git from 'isomorphic-git';
import sqlite3 from 'sqlite3';
import { WorkspaceProvider } from './workspace-provider';
import { RequestInput, RequestRecord, RequestStatus, WorkspaceRecord, WorkspaceSnapshot } from './workspace-types';

function run(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    db.run(sql, params, (error) => error ? reject(error) : resolvePromise());
  });
}

function all<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolvePromise, reject) => {
    db.all(sql, params, (error, rows) => error ? reject(error) : resolvePromise(rows as T[]));
  });
}

function get<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolvePromise, reject) => {
    db.get(sql, params, (error, row) => error ? reject(error) : resolvePromise(row as T | undefined));
  });
}

function close(db: sqlite3.Database): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    db.close((error) => error ? reject(error) : resolvePromise());
  });
}

export class LocalWorkspaceService implements WorkspaceProvider {
  private readonly workspaceRoot: string;
  private readonly codeServerBaseUrl: string;

  constructor(workspaceRoot = process.env.WORKSPACE_ROOT || resolve(process.cwd(), 'data/workspaces')) {
    this.workspaceRoot = workspaceRoot;
    this.codeServerBaseUrl = (process.env.CODE_SERVER_URL || 'http://localhost:8080').replace(/\/$/, '');
  }

  async provision(projectId: string, projectName: string, _owner?: string): Promise<WorkspaceRecord> {
    const workspaceId = `local-${projectId}`;
    const sourcePath = this.sourcePath(workspaceId);
    await mkdir(sourcePath, { recursive: true });
    await writeFile(join(sourcePath, 'README.md'), `# ${projectName}\n\nGenerated from the platform golden template. The workspace contains a React/Vite frontend in frontend/ and a Python/FastAPI backend in backend/, backed by workspace-local SQLite.\n`, { flag: 'a' });
    await writeFile(join(sourcePath, 'workspace.json'), JSON.stringify({ projectId, templateVersion: '1.0.0', runtime: 'local-poc' }, null, 2));
    await this.copyGoldenApp(sourcePath);
    await this.initializeDatabase(workspaceId);
    await this.initializeGit(sourcePath, workspaceId);
    await this.setLifecycle(workspaceId, 'Running');
    const currentCommit = await this.currentCommit(sourcePath);
    return {
      workspaceId,
      sourceRepository: `local://${projectId}`,
      currentCommit,
      workspaceUrl: this.codeServerWorkspaceUrl(workspaceId),
      frontendPreviewUrl: `http://localhost:5173/preview/${projectId}`,
      apiPreviewUrl: `http://localhost:5173/api-preview/${projectId}`,
    };
  }

  async start(workspaceId: string): Promise<void> {
    await this.assertWorkspace(workspaceId);
    await this.ensureSource(workspaceId);
    await this.initializeDatabase(workspaceId);
    await this.setLifecycle(workspaceId, 'Running');
  }

  async stop(workspaceId: string): Promise<void> {
    await this.assertWorkspace(workspaceId);
    await this.setLifecycle(workspaceId, 'Stopped');
  }

  async delete(workspaceId: string): Promise<void> {
    const workspacePath = this.workspacePath(workspaceId);
    await rm(workspacePath, { recursive: true, force: true });
    await rm(join(this.workspaceRoot, 'git-recovery', workspaceId), { recursive: true, force: true });
  }

  async restoreFromGit(workspaceId: string): Promise<string> {
    const recoveryPath = this.gitRecoveryPath(workspaceId);
    if (!nodeFs.existsSync(recoveryPath)) throw new Error('Git recovery snapshot is not available');
    const sourcePath = this.sourcePath(workspaceId);
    await rm(sourcePath, { recursive: true, force: true });
    await mkdir(sourcePath, { recursive: true });
    await cp(recoveryPath, join(sourcePath, '.git'), { recursive: true });
    await git.checkout({ fs: nodeFs, dir: sourcePath, ref: 'main', force: true });
    return this.currentCommit(sourcePath);
  }

  async describe(workspaceId: string, _owner?: string): Promise<WorkspaceSnapshot> {
    const sourcePath = this.sourcePath(workspaceId);
    await this.assertWorkspace(workspaceId);
    await this.ensureSource(workspaceId);
    const sourceFiles = (await readdir(sourcePath)).filter((file) => file !== '.git').sort();
    const currentCommit = await this.currentCommit(sourcePath);
    await this.saveGitRecovery(sourcePath, workspaceId);
    return {
      workspaceId,
      lifecycleStatus: await this.lifecycleStatus(workspaceId),
      currentCommit,
      sourceFiles,
      applicationDataFile: 'application.sqlite',
      codeServerUrl: this.codeServerWorkspaceUrl(workspaceId),
    };
  }

  async createRequest(workspaceId: string, input: RequestInput): Promise<RequestRecord> {
    await this.assertWorkspace(workspaceId);
    const title = input.title.trim();
    if (!title) throw new Error('Request title is required');
    const now = new Date().toISOString();
    const record: RequestRecord = { id: randomUUID(), title, description: input.description?.trim() || null, status: 'Open', createdAt: now, updatedAt: now };
    await this.withDatabase(workspaceId, async (db) => {
      await run(db, 'INSERT INTO requests (id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [record.id, record.title, record.description, record.status, record.createdAt, record.updatedAt]);
    });
    return record;
  }

  async listRequests(workspaceId: string): Promise<RequestRecord[]> {
    await this.assertWorkspace(workspaceId);
    return this.withDatabase(workspaceId, (db) => all<RequestRecord>(db, 'SELECT id, title, description, status, created_at AS createdAt, updated_at AS updatedAt FROM requests ORDER BY created_at DESC'));
  }

  async updateRequest(workspaceId: string, requestId: string, status: RequestStatus): Promise<RequestRecord> {
    await this.assertWorkspace(workspaceId);
    if (!['Open', 'In Progress', 'Done'].includes(status)) throw new Error('Request status is invalid');
    const updatedAt = new Date().toISOString();
    await this.withDatabase(workspaceId, async (db) => {
      await run(db, 'UPDATE requests SET status = ?, updated_at = ? WHERE id = ?', [status, updatedAt, requestId]);
    });
    const record = await this.withDatabase(workspaceId, (db) => get<RequestRecord>(db, 'SELECT id, title, description, status, created_at AS createdAt, updated_at AS updatedAt FROM requests WHERE id = ?', [requestId]));
    if (!record) throw new Error('Request not found');
    return record;
  }

  private sourcePath(workspaceId: string): string {
    if (!/^local-[a-z0-9-]+$/i.test(workspaceId)) throw new Error('Invalid workspace ID');
    return join(this.workspaceRoot, workspaceId, 'source');
  }

  private workspacePath(workspaceId: string): string {
    if (!/^local-[a-z0-9-]+$/i.test(workspaceId)) throw new Error('Invalid workspace ID');
    return join(this.workspaceRoot, workspaceId);
  }

  private codeServerWorkspaceUrl(workspaceId: string): string {
    return `${this.codeServerBaseUrl}/?folder=/workspaces/${workspaceId}/source`;
  }

  private databasePath(workspaceId: string): string {
    return join(this.workspaceRoot, workspaceId, 'application.sqlite');
  }

  private lifecyclePath(workspaceId: string): string {
    if (!/^local-[a-z0-9-]+$/i.test(workspaceId)) throw new Error('Invalid workspace ID');
    return join(this.workspaceRoot, workspaceId, 'lifecycle.json');
  }

  private async setLifecycle(workspaceId: string, status: 'Running' | 'Stopped'): Promise<void> {
    await writeFile(this.lifecyclePath(workspaceId), JSON.stringify({ status }, null, 2));
  }

  private async lifecycleStatus(workspaceId: string): Promise<'Running' | 'Stopped'> {
    try {
      const stored = JSON.parse(await readFile(this.lifecyclePath(workspaceId), 'utf8')) as { status?: 'Running' | 'Stopped' };
      return stored.status === 'Stopped' ? 'Stopped' : 'Running';
    } catch {
      return 'Running';
    }
  }

  private async assertWorkspace(workspaceId: string): Promise<void> {
    if (!nodeFs.existsSync(this.workspacePath(workspaceId))) {
      throw new Error('Workspace not found');
    }
  }

  private async ensureSource(workspaceId: string): Promise<string> {
    const sourcePath = this.sourcePath(workspaceId);
    await mkdir(sourcePath, { recursive: true });
    await this.migrateLegacyLayout(sourcePath);
    if (
      !nodeFs.existsSync(join(sourcePath, '.clinerules'))
      || !nodeFs.existsSync(join(sourcePath, '.github', 'copilot-instructions.md'))
      || !nodeFs.existsSync(join(sourcePath, '.github', 'skills', 'manifest.yaml'))
    ) {
      await this.copyGoldenApp(sourcePath);
    }
    if (!nodeFs.existsSync(join(sourcePath, 'backend', 'main.py'))) {
      await writeFile(join(sourcePath, 'README.md'), '# Recovered Vibe Code Project\n', { flag: 'a' });
      await writeFile(join(sourcePath, 'workspace.json'), JSON.stringify({ workspaceId, runtime: 'local-poc' }, null, 2), { flag: 'a' });
      await this.copyGoldenApp(sourcePath);
    }
    if (!nodeFs.existsSync(join(sourcePath, '.git'))) {
      if (!nodeFs.existsSync(join(sourcePath, 'README.md'))) await writeFile(join(sourcePath, 'README.md'), '# Recovered Vibe Code Project\n');
      if (!nodeFs.existsSync(join(sourcePath, 'workspace.json'))) await writeFile(join(sourcePath, 'workspace.json'), JSON.stringify({ workspaceId, runtime: 'local-poc' }, null, 2));
      await this.initializeGit(sourcePath, workspaceId);
    }
    return sourcePath;
  }

  private async initializeDatabase(workspaceId: string): Promise<void> {
    await mkdir(join(this.workspaceRoot, workspaceId), { recursive: true });
    await this.withDatabase(workspaceId, async (db) => {
      await run(db, `CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL CHECK (length(trim(title)) > 0),
      description TEXT,
      status TEXT NOT NULL CHECK (status IN ('Open', 'In Progress', 'Done')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
      const columns = await all<{ name: string }>(db, 'PRAGMA table_info(requests)');
      if (columns.some((column) => column.name === 'createdAt')) await run(db, 'ALTER TABLE requests RENAME COLUMN createdAt TO created_at');
      if (columns.some((column) => column.name === 'updatedAt')) await run(db, 'ALTER TABLE requests RENAME COLUMN updatedAt TO updated_at');
    });
  }

  private async withDatabase<T>(workspaceId: string, action: (db: sqlite3.Database) => Promise<T>): Promise<T> {
    const db = new sqlite3.Database(this.databasePath(workspaceId));
    try {
      return await action(db);
    } finally {
      await close(db);
    }
  }

  private async initializeGit(sourcePath: string, workspaceId: string): Promise<void> {
    if (!nodeFs.existsSync(join(sourcePath, '.git'))) {
      await git.init({ fs: nodeFs, dir: sourcePath, defaultBranch: 'main' });
      await git.add({ fs: nodeFs, dir: sourcePath, filepath: 'README.md' });
      await git.add({ fs: nodeFs, dir: sourcePath, filepath: 'workspace.json' });
      for (const filepath of [
        '.clinerules/ponytail.md',
        '.github/copilot-instructions.md',
        '.github/skills/manifest.yaml',
        '.github/skills/brainstorm-and-converge/SKILL.md',
        '.github/skills/frontend-design-direction/SKILL.md',
        '.github/skills/implementation-minimality/SKILL.md',
        '.github/skills/intake-sizing-and-escalation/SKILL.md',
        '.github/skills/prototype-spike/SKILL.md',
        '.github/skills/skill-supply-chain-review/SKILL.md',
        '.github/skills/ux-product-design/SKILL.md',
        '.github/skills/visual-browser-qa/SKILL.md',
        'backend/main.py', 'backend/requirements.txt', 'backend/static/index.html', 'backend/test_main.py',
        'frontend/.gitignore', 'frontend/package.json', 'frontend/index.html', 'frontend/tsconfig.json',
        'frontend/tsconfig.node.json', 'frontend/vite.config.ts',
        'frontend/src/vite-env.d.ts', 'frontend/src/main.tsx', 'frontend/src/App.tsx', 'frontend/src/styles.css',
      ]) {
        if (nodeFs.existsSync(join(sourcePath, filepath))) await git.add({ fs: nodeFs, dir: sourcePath, filepath });
      }
      await git.commit({ fs: nodeFs, dir: sourcePath, message: 'Initialize golden project', author: { name: 'Vibe Code Platform', email: 'platform@localhost.test' } });
    }
    await this.saveGitRecovery(sourcePath, workspaceId);
  }

  private gitRecoveryPath(workspaceId: string): string {
    if (!/^local-[a-z0-9-]+$/i.test(workspaceId)) throw new Error('Invalid workspace ID');
    return join(this.workspaceRoot, 'git-recovery', workspaceId, '.git');
  }

  private async saveGitRecovery(sourcePath: string, workspaceId: string): Promise<void> {
    const recoveryPath = this.gitRecoveryPath(workspaceId);
    await mkdir(join(this.workspaceRoot, 'git-recovery', workspaceId), { recursive: true });
    await rm(recoveryPath, { recursive: true, force: true });
    await cp(join(sourcePath, '.git'), recoveryPath, { recursive: true });
  }

  private async copyGoldenApp(sourcePath: string): Promise<void> {
    const configuredRoot = process.env.GOLDEN_APP_TEMPLATE_ROOT;
    const candidates = configuredRoot ? [configuredRoot] : [
      resolve(process.cwd(), 'workspace-template/golden-app'),
      resolve(process.cwd(), '../../workspace-template/golden-app'),
    ];
    const templateRoot = candidates.find((candidate) => nodeFs.existsSync(candidate));
    if (!templateRoot) return;
    if (nodeFs.existsSync(join(templateRoot, '.clinerules'))) {
      await cp(join(templateRoot, '.clinerules'), join(sourcePath, '.clinerules'), { recursive: true, force: false });
    }
    if (nodeFs.existsSync(join(templateRoot, '.github'))) {
      await cp(join(templateRoot, '.github'), join(sourcePath, '.github'), { recursive: true, force: false });
    }
    await cp(join(templateRoot, 'backend'), join(sourcePath, 'backend'), { recursive: true, force: false });
    await cp(join(templateRoot, 'frontend'), join(sourcePath, 'frontend'), { recursive: true, force: false });
  }

  private async migrateLegacyLayout(sourcePath: string): Promise<void> {
    if (!nodeFs.existsSync(join(sourcePath, 'main.py')) || nodeFs.existsSync(join(sourcePath, 'backend', 'main.py'))) return;
    await mkdir(join(sourcePath, 'backend'), { recursive: true });
    for (const filepath of ['main.py', 'requirements.txt', 'test_main.py']) {
      const sourceFile = join(sourcePath, filepath);
      if (nodeFs.existsSync(sourceFile)) await cp(sourceFile, join(sourcePath, 'backend', filepath), { force: false });
    }
    if (nodeFs.existsSync(join(sourcePath, 'static'))) await cp(join(sourcePath, 'static'), join(sourcePath, 'backend', 'static'), { recursive: true, force: false });
    for (const filepath of ['main.py', 'requirements.txt', 'test_main.py', 'static']) {
      await rm(join(sourcePath, filepath), { recursive: true, force: true });
    }
  }

  private async currentCommit(sourcePath: string): Promise<string> {
    const commits = await git.log({ fs: nodeFs, dir: sourcePath, depth: 1 });
    return commits[0]?.oid || '';
  }
}
