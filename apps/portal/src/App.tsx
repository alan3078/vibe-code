import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, Project, RequestRecord, seededUsers, User } from './api';
import { AdminPage } from './AdminPage';
import './styles.css';

const storedUser = () => {
  const value = sessionStorage.getItem('vibe-user');
  return value ? (JSON.parse(value) as User) : null;
};

function StatusPill({ status }: { status: Project['status'] }) {
  return <span className={`status status-${status.toLowerCase()}`}><span className="status-dot" />{status}</span>;
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : 'The control plane is unavailable.';
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return <div className="error-card" role="alert">
    <div className="error-icon">!</div>
    <div>
      <strong>We couldn’t load this workspace data.</strong>
      <p>{message}</p>
      {requestId && <small>Request ID: {requestId}</small>}
    </div>
    <button type="button" className="button button-secondary" onClick={onRetry}>Try again</button>
  </div>;
}

export async function waitForProjectRunning(id: string, initial: Project): Promise<Project> {
  let current = initial;
  const deadline = Date.now() + 4 * 60 * 1000;
  while ((current.status === 'Creating' || current.status === 'Starting') && Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    current = await api.getProject(id);
  }
  if (current.status !== 'Running') throw new Error(`Workspace is ${current.status.toLowerCase()}. Retry from the project page.`);
  return current;
}

function Shell({ user, onLogout, children }: { user: User; onLogout: () => void; children: ReactNode }) {
  const location = useLocation();
  return <div className="app-shell">
    <header className="topbar">
      <Link to="/projects" className="brand"><span className="brand-mark">✦</span><span>vibe<span className="brand-muted">/code</span></span></Link>
      <nav className="topnav" aria-label="Primary navigation">
        <Link className={location.pathname.startsWith('/projects') ? 'active' : ''} to="/projects">My projects</Link>
        {user.role === 'Administrator' ? <Link className={location.pathname.startsWith('/admin') ? 'active' : ''} to="/admin">Administration</Link> : null}
      </nav>
      <div className="profile-menu"><span className="avatar">{user.name.split(' ').map((part) => part[0]).join('')}</span><span className="profile-name">{user.name}</span><span className="user-role">{user.role || 'Member'}</span><button className="logout" onClick={onLogout}>Log out</button></div>
    </header>
    <main className="page-content">{children}</main>
  </div>;
}

function LoginPage({ onLogin }: { onLogin: (result: { token: string; user: User }) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [failedUser, setFailedUser] = useState<User | null>(null);
  const login = async (user: User) => {
    setBusy(user.id); setError(null); setFailedUser(null);
    try { onLogin(await api.demoLogin(user.id)); } catch (caught) { setError(caught); setFailedUser(user); setBusy(null); }
  };
  return <div className="login-layout">
    <section className="login-story">
      <Link to="/" className="brand brand-light"><span className="brand-mark">✦</span><span>vibe<span className="brand-muted">/code</span></span></Link>
      <div className="story-copy"><p className="eyebrow">BUILD WITH MOMENTUM</p><h1>Your idea deserves a place to run.</h1><p>Create, shape, and continue real projects in a workspace that remembers where you left off.</p></div>
      <div className="story-footer"><span>LOCAL POC</span><span>•</span><span>REACT + NESTJS + POSTGRES</span></div>
    </section>
    <section className="login-panel">
      <div className="login-card"><p className="eyebrow">WELCOME BACK</p><h2>Sign in to your workspace</h2><p className="muted">Choose a named POC user to continue.</p>
        <div className="user-options">{seededUsers.map((user) => <button key={user.id} aria-label={`Continue as ${user.name}`} className="user-option" disabled={!!busy} onClick={() => void login(user)}><span className="avatar avatar-large">{user.name.split(' ').map((part) => part[0]).join('')}</span><span className="user-details"><strong>{user.name}</strong><small>{user.email}</small></span><span className="arrow">{busy === user.id ? '…' : '→'}</span></button>)}</div>
        {error ? <ErrorState error={error} onRetry={() => failedUser ? void login(failedUser) : setError(null)} /> : null}
        <p className="login-note">Local named-user POC identity only. SSO is intentionally outside this POC.</p>
      </div>
    </section>
  </div>;
}

function ProjectCard({ project, onChanged }: { project: Project; onChanged: (project: Project) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggleLifecycle = async () => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await api.setLifecycle(project.id, project.status === 'Stopped' || project.status === 'Failed' ? 'start' : 'stop'));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Workspace lifecycle action failed.');
    } finally {
      setBusy(false);
    }
  };
  const retry = async () => {
    setBusy(true);
    setError(null);
    try { onChanged(await api.getProject(project.id)); } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Workspace status could not be refreshed.'); } finally { setBusy(false); }
  };
  return <article className="project-card">
    <div className="project-card-top"><div className="project-symbol">{project.name.slice(0, 1).toUpperCase()}</div><StatusPill status={project.status} /></div>
    <h2>{project.name}</h2><p>{project.description || 'No description yet.'}</p>
    <div className="project-meta"><span>Template {project.template.version}</span><span>{project.lastOpenedAt ? `Opened ${new Date(project.lastOpenedAt).toLocaleDateString()}` : 'Not opened yet'}</span></div>
    {error && <small className="card-error">{error}</small>}
    {project.lastKnownError && <div className="card-provider-error" role="alert"><small>{project.lastKnownError}</small><button className="text-button" disabled={busy} onClick={() => void retry()}>{busy ? 'Retrying…' : 'Retry'}</button></div>}
    <div className="card-actions"><Link className="card-action" to={`/projects/${project.id}`}>Open Workspace <span>→</span></Link><button className="text-button" disabled={busy || ['Creating', 'Starting', 'Stopping', 'Deleting', 'Deleted'].includes(project.status)} onClick={() => void toggleLifecycle()}>{busy ? 'Working…' : project.status === 'Stopped' || project.status === 'Failed' ? 'Start' : project.status === 'Creating' ? 'Creating…' : project.status === 'Starting' ? 'Starting…' : project.status === 'Stopping' ? 'Stopping…' : project.status === 'Deleting' ? 'Deleting…' : 'Stop'}</button></div>
  </article>;
}

function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const load = async () => { setLoading(true); setError(null); try { setProjects(await api.listProjects()); } catch (caught) { setError(caught); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR CREATIVE SPACE</p><h1>My projects</h1><p className="muted">Build something useful. Keep moving when inspiration strikes.</p></div><button className="button button-primary" onClick={() => navigate('/projects/new')}><span>＋</span> New project</button></div>
    {loading && <div className="loading-card"><span className="spinner" />Loading your projects…</div>}
    {!loading && error ? <ErrorState error={error} onRetry={() => void load()} /> : null}
    {!loading && !error && projects.length === 0 && <div className="empty-card"><div className="empty-art"><span>✦</span></div><h2>A blank canvas is a good start.</h2><p>You don’t have any projects yet. Create your first one from the golden template.</p><button className="button button-primary" onClick={() => navigate('/projects/new')}>Create your first project <span>→</span></button></div>}
    {!loading && !error && projects.length > 0 && <div className="project-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} onChanged={(updated) => setProjects((current) => current.map((item) => item.id === updated.id ? updated : item))} />)}</div>}
  </>;
}

function CreateProjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const create = async () => {
    if (name.trim().length < 2) {
      setError(new Error('Project name must be at least 2 characters.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const project = await api.createProject({ name: name.trim(), description: description.trim() || undefined }, idempotencyKey);
      navigate(`/projects/${project.id}`);
    } catch (caught) {
      setError(caught);
      setBusy(false);
    }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void create(); };
  return <div className="form-page"><Link to="/projects" className="back-link">← Back to my projects</Link><div className="form-header"><p className="eyebrow">START SOMETHING NEW</p><h1>Create a project</h1><p className="muted">A ready-to-run workspace, seeded from one trusted template.</p></div><form className="project-form" onSubmit={submit}><label>Project name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Internal Request Tracker" maxLength={100} /><small>Use a short, memorable name.</small></label><label>Short description <span className="optional">Optional</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you hoping to build?" maxLength={500} rows={4} /></label><fieldset><legend>Template</legend><div className="template-choice"><span className="template-icon">◈</span><span><strong>React + Vite / Python + FastAPI</strong><small>Version 1.0.0 · frontend/ + backend/ · Ready to run</small></span><span className="selected">Selected</span></div></fieldset>{error ? <ErrorState error={error} onRetry={() => void create()} /> : null}<div className="form-actions"><Link className="button button-ghost" to="/projects">Cancel</Link><button className="button button-primary" disabled={busy}>{busy ? <><span className="spinner spinner-light" /> Creating workspace…</> : <>Create project <span>→</span></>}</button></div></form></div>;
}

function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'start' | 'stop' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [deleted, setDeleted] = useState(false);
  const load = async () => { if (!id) return; setLoading(true); setError(null); try { setProject(await api.getProject(id)); } catch (caught) { setError(caught); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [id]);
  useEffect(() => {
    if (!id || !project || !['Creating', 'Starting', 'Stopping', 'Deleting'].includes(project.status)) return;
    const timer = window.setInterval(() => { void api.getProject(id).then(setProject).catch((caught) => {
      if (project.status === 'Deleting' && caught instanceof ApiError && caught.status === 404) {
        setDeleted(true);
        window.clearInterval(timer);
        return;
      }
      setError(caught);
    }); }, 800);
    return () => window.clearInterval(timer);
  }, [id, project?.status]);
  const lifecycle = async (next: 'start' | 'stop') => { if (!id) return; setAction(next); setError(null); try { setProject(await api.setLifecycle(id, next)); } catch (caught) { setError(caught); } finally { setAction(null); } };
  const remove = async () => {
    if (!id || !project || !window.confirm(`Delete “${project.name}”? The workspace volume and local preview data will be removed.`)) return;
    setAction('stop'); setError(null);
    try { setProject(await api.deleteProject(id)); } catch (caught) { setError(caught); } finally { setAction(null); }
  };
  const openWorkspace = async () => {
    const current = project;
    if (!id || !current || ['Creating', 'Starting', 'Stopping', 'Deleting', 'Deleted'].includes(current.status)) return;
    setError(null);
    setAction('start');
    try {
      let ready = current.status === 'Running' ? current : await api.setLifecycle(id, 'start');
      if (ready.status === 'Creating' || ready.status === 'Starting') ready = await waitForProjectRunning(id, ready);
      setProject(ready);
      const target = ready.workspaceUrl || `/workspaces/${ready.id}`;
      if (target.startsWith('http')) window.location.assign(target);
      else navigate(target);
    } catch (caught) {
      setError(caught);
    } finally {
      setAction(null);
    }
  };
  if (loading) return <div className="loading-card"><span className="spinner" />Opening project…</div>;
  if (deleted) return <div className="empty-card"><div className="empty-art"><span>✓</span></div><h1>Project deleted</h1><p>The workspace volume and local preview data have been removed.</p><button className="button button-primary" onClick={() => navigate('/projects')}>Return to my projects</button></div>;
  if (error || !project) return <><Link to="/projects" className="back-link">← Back to my projects</Link><ErrorState error={error || new Error('Project not found.')} onRetry={() => void load()} /></>;
  const transitionPending = ['Creating', 'Starting', 'Stopping', 'Deleting'].includes(project.status);
  const frontendTarget = project.frontendPreviewUrl || `/preview/${project.id}`;
  const frontendExternal = frontendTarget.startsWith('http') && !frontendTarget.includes('localhost:5173/preview/');
  return <div className="detail-page"><Link to="/projects" className="back-link">← Back to my projects</Link><div className="detail-heading"><div><div className="detail-title"><div className="project-symbol large">{project.name.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">PROJECT</p><h1>{project.name}</h1></div></div><p className="muted detail-description">{project.description || 'No description yet.'}</p></div><div className="detail-actions"><StatusPill status={project.status} />{project.status === 'Stopped' || project.status === 'Failed' ? <button className="button button-primary" disabled={!!action} onClick={() => void lifecycle('start')}>{action === 'start' ? 'Starting…' : 'Start workspace'}</button> : <button className="button button-secondary" disabled={!!action || transitionPending || project.status === 'Deleted'} onClick={() => void lifecycle('stop')}>{project.status === 'Creating' ? 'Creating…' : project.status === 'Starting' ? 'Starting…' : project.status === 'Stopping' ? 'Stopping…' : project.status === 'Deleting' ? 'Deleting…' : 'Stop workspace'}</button>}<button className="text-button danger-button" disabled={!!action || project.status === 'Deleting' || project.status === 'Deleted'} onClick={() => void remove()}>Delete project</button></div></div>{error ? <ErrorState error={error} onRetry={() => setError(null)} /> : null}{project.lastKnownError && <div className="error-card" role="alert"><div className="error-icon">!</div><div><strong>Workspace provisioning failed.</strong><p>{project.lastKnownError}</p></div><button className="button button-secondary" onClick={() => void lifecycle('start')}>Retry</button></div>}<div className="detail-grid"><section className="detail-main"><div className="section-heading"><div><p className="eyebrow">WORKSPACE</p><h2>Ready when you are</h2></div><span className="live-indicator"><span />{project.status === 'Running' ? 'Workspace online' : project.status === 'Creating' || project.status === 'Starting' ? 'Provisioning workspace' : project.status === 'Stopping' ? 'Stopping workspace' : project.status === 'Deleting' ? 'Deleting workspace' : 'Workspace paused'}</span></div><div className="workspace-card"><div className="workspace-visual"><div className="window-dots"><i /><i /><i /></div><div className="code-lines"><span /><span /><span className="short" /><span /><span className="medium" /></div></div><div className="workspace-copy"><h3>Real code-server IDE</h3><p>Open the VS Code-compatible browser IDE for this project. Your edits are saved in the persistent workspace volume.</p><button className={`button button-primary ${transitionPending || project.status === 'Deleted' ? 'disabled-link' : ''}`} disabled={!!action || transitionPending || project.status === 'Deleted'} onClick={() => void openWorkspace()}>{action === 'start' ? 'Starting…' : 'Open code-server IDE'} <span>↗</span></button></div></div><div className="section-heading preview-heading"><div><p className="eyebrow">PREVIEWS</p><h2>See your project live</h2></div></div><div className="preview-grid">{project.status === 'Running' ? frontendExternal ? <a className="preview-card" href={frontendTarget} target="_blank" rel="noreferrer"><span className="preview-icon">▣</span><span><strong>Frontend preview</strong><small>Authenticated request tracker</small></span><span>↗</span></a> : <Link className="preview-card" to={`/preview/${project.id}`}><span className="preview-icon">▣</span><span><strong>Frontend preview</strong><small>Authenticated request tracker</small></span><span>↗</span></Link> : <span className="preview-card disabled"><span className="preview-icon">▣</span><span><strong>Frontend preview</strong><small>Available while workspace is running</small></span><span>↗</span></span>}<a className={`preview-card ${project.status !== 'Running' ? 'disabled' : ''}`} href={project.status === 'Running' ? project.apiPreviewUrl : undefined} target="_blank" rel="noreferrer"><span className="preview-icon purple">⌁</span><span><strong>API preview</strong><small>Authenticated request API</small></span><span>↗</span></a></div></section><aside className="detail-sidebar"><div className="sidebar-card"><p className="eyebrow">PROJECT PASSPORT</p><dl><div><dt>Template</dt><dd>{project.template.name}</dd></div><div><dt>Version</dt><dd>{project.template.version}</dd></div><div><dt>Workspace</dt><dd className="mono">{project.workspaceId}</dd></div><div><dt>Workspace URL</dt><dd className="mono">{project.workspaceUrl || 'Not available'}</dd></div><div><dt>Source</dt><dd>{project.sourceRepository || 'Not connected yet'}</dd></div><div><dt>Commit</dt><dd className="mono">{project.currentCommit || 'No commits yet'}</dd></div></dl></div><div className="sidebar-card next-card"><span className="next-icon">✦</span><h3>Make it yours</h3><p>Open code-server, review the source, and use Cline with your own configured model provider if desired.</p><span className="muted small">No platform AI gateway is included in this POC.</span></div></aside></div><button className="text-button" onClick={() => navigate('/projects')}>← Return to all projects</button></div>;
}

function ApiPreviewPage() {
  const { id } = useParams();
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try { setRequests(await api.listRequests(id)); } catch (caught) { setError(caught); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [id]);
  return <div className="api-preview-page"><Link to={`/projects/${id || ''}`} className="back-link">← Back to project</Link><div className="preview-page-heading"><div><p className="eyebrow">API PREVIEW · AUTHENTICATED</p><h1>API response</h1><p className="muted">The portal carries your session to the local project API preview.</p></div><button className="button button-secondary" onClick={() => void load()}>↻ Refresh</button></div>{error ? <ErrorState error={error} onRetry={() => void load()} /> : loading ? <div className="loading-card"><span className="spinner" />Loading API response…</div> : <pre className="api-response" aria-label="Authenticated API response">{JSON.stringify(requests, null, 2)}</pre>}</div>;
}

function WorkspacePage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof api.describeWorkspace>> | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { if (!id) return; void Promise.all([api.getProject(id), api.describeWorkspace(id)]).then(([loadedProject, loadedSnapshot]) => { setProject(loadedProject); setSnapshot(loadedSnapshot); }).catch(setError); }, [id]);
  if (error) return <><Link to="/projects" className="back-link">← Back to my projects</Link><ErrorState error={error} onRetry={() => window.location.reload()} /></>;
  if (!project || !snapshot) return <div className="loading-card"><span className="spinner" />Opening code-server IDE…</div>;
  return <div className="workspace-page"><Link to={`/projects/${project.id}`} className="back-link">← Back to project</Link><div className="workspace-page-heading"><div><p className="eyebrow">REAL BROWSER IDE</p><h1>{project.name}</h1><p className="muted">This project opens in a VS Code-compatible code-server workspace with the source tree mounted from the persistent volume.</p></div><StatusPill status={project.status} /></div><div className="workspace-card"><div className="workspace-copy"><h2>Your IDE is ready.</h2><p>Open code-server to edit files, use the integrated terminal, and continue with the optional Cline extension. The project source and SQLite data remain on the Compose volume.</p><div className="workspace-actions"><a className="button button-primary" href={snapshot.codeServerUrl || project.workspaceUrl || undefined} target="_blank" rel="noreferrer">Open code-server IDE <span>↗</span></a>{project.status === 'Running' ? <Link className="button button-secondary" to={`/preview/${project.id}`}>Open preview <span>↗</span></Link> : null}</div></div></div></div>;
}

function PreviewPage() {
  const { id } = useParams();
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const load = async () => { if (!id) return; setLoading(true); setError(null); try { setRequests(await api.listRequests(id)); } catch (caught) { setError(caught); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [id]);
  const create = async (event: FormEvent) => { event.preventDefault(); if (!id) return; setBusy(true); setError(null); try { const record = await api.createRequest(id, { title, description: description || undefined }); setRequests((current) => [record, ...current]); setTitle(''); setDescription(''); } catch (caught) { setError(caught); } finally { setBusy(false); } };
  const update = async (request: RequestRecord, status: RequestRecord['status']) => { if (!id) return; try { const updated = await api.updateRequest(id, request.id, status); setRequests((current) => current.map((item) => item.id === updated.id ? updated : item)); } catch (caught) { setError(caught); } };
  return <div className="preview-page"><Link to={`/projects/${id || ''}`} className="back-link">← Back to project</Link><div className="preview-page-heading"><div><p className="eyebrow">FRONTEND PREVIEW · AUTHENTICATED</p><h1>Internal Request Tracker</h1><p className="muted">A real database-backed app running from this project workspace.</p></div><span className="preview-live"><span />LIVE PREVIEW</span></div>{error ? <ErrorState error={error} onRetry={() => void load()} /> : null}<div className="tracker-layout"><section className="tracker-list"><div className="section-heading"><div><p className="eyebrow">REQUESTS</p><h2>{requests.length ? `${requests.length} request${requests.length === 1 ? '' : 's'}` : 'No requests yet'}</h2></div><button className="text-button" onClick={() => void load()}>↻ Refresh</button></div>{loading ? <div className="loading-card"><span className="spinner" />Loading requests…</div> : requests.length === 0 ? <div className="tracker-empty"><span>＋</span><h3>Your queue is clear.</h3><p>Create the first request to prove data persistence.</p></div> : <div className="request-items">{requests.map((request) => <article className="request-item" key={request.id}><div className="request-item-copy"><div className="request-item-title"><h3>{request.title}</h3><select value={request.status} onChange={(event) => void update(request, event.target.value as RequestRecord['status'])} aria-label={`Status for ${request.title}`}><option>Open</option><option>In Progress</option><option>Done</option></select></div>{request.description && <p>{request.description}</p>}<small>Updated {new Date(request.updatedAt).toLocaleString()}</small></div></article>)}</div>}</section><aside className="tracker-form-card"><p className="eyebrow">NEW REQUEST</p><h2>What needs attention?</h2><form onSubmit={create}><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Review access request" required /></label><label>Details <span className="optional">Optional</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add useful context" rows={5} /></label><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Create request →'}</button></form></aside></div></div>;
}

function AuthenticatedApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <Shell user={user} onLogout={onLogout}><Routes><Route path="/projects" element={<ProjectsPage />} /><Route path="/projects/new" element={<CreateProjectPage />} /><Route path="/projects/:id" element={<ProjectDetailPage />} /><Route path="/workspaces/:id" element={<WorkspacePage />} /><Route path="/preview/:id" element={<PreviewPage />} /><Route path="/api-preview/:id" element={<ApiPreviewPage />} />{user.role === 'Administrator' ? <Route path="/admin" element={<AdminPage />} /> : null}<Route path="*" element={<Navigate to="/projects" replace />} /></Routes></Shell>;
}

export function App() {
  const [user, setUser] = useState<User | null>(storedUser);
  const login = (result: { token: string; user: User }) => { sessionStorage.setItem('vibe-token', result.token); sessionStorage.setItem('vibe-user', JSON.stringify(result.user)); setUser(result.user); };
  const logout = () => { sessionStorage.removeItem('vibe-token'); sessionStorage.removeItem('vibe-user'); setUser(null); };
  return <BrowserRouter>{user ? <AuthenticatedApp user={user} onLogout={logout} /> : <Routes><Route path="*" element={<LoginPage onLogin={login} />} /></Routes>}</BrowserRouter>;
}
