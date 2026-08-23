import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { api, ApiError, AuditLog, CmsFilters, ConfigurationGroup, ConfigurationItem, Project, ProjectStatus, RoleSummary, User, UserRole } from './api';

type AdminModule = 'overview' | 'projects' | 'configuration' | 'users' | 'audit';
type AdminProjectPayload = { ownerId: string; name: string; description?: string };
type CreateAttempt = { fingerprint: string; key: string };

export function nextCreateAttempt(current: CreateAttempt | null, payload: AdminProjectPayload, createKey = () => crypto.randomUUID()): CreateAttempt {
  const fingerprint = JSON.stringify(payload);
  return current?.fingerprint === fingerprint ? current : { fingerprint, key: createKey() };
}

export function clampCmsPage(page: number, total: number, pageSize: number): number {
  return Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
}

export function acceptsOwnerResponse(request: number, latestRequest: number): boolean {
  return request === latestRequest;
}

const modules: ReadonlyArray<[AdminModule, string]> = [
  ['overview', 'Overview'],
  ['projects', 'Projects'],
  ['configuration', 'Configuration'],
  ['users', 'Users & roles'],
  ['audit', 'Audit log'],
];

function StatusPill({ status }: { status: ProjectStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}>{status}</span>;
}

function ErrorBanner({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'The administration service is unavailable.';
  return <div className="error-card" role="alert"><div className="error-icon">!</div><div><strong>Could not complete the request.</strong><p>{message}</p></div><button className="button button-secondary" onClick={onRetry}>Try again</button></div>;
}

function Pagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="cms-pagination"><span>{total === 0 ? 'No results' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}</span><div><button className="button button-secondary" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button className="button button-secondary" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next</button></div></div>;
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return <label><span>{label}</span>{children}</label>;
}

function SearchPanel({ module, filters, advanced, onFilters, onAdvanced, onSearch, onReset }: { module: Exclude<AdminModule, 'overview'>; filters: CmsFilters; advanced: boolean; onFilters: (filters: CmsFilters) => void; onAdvanced: () => void; onSearch: () => void; onReset: () => void }) {
  const set = (key: string, value: string) => onFilters({ ...filters, [key]: value });
  const commonProps = (key: string) => ({ value: String(filters[key] ?? ''), onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => set(key, event.target.value) });
  return <form className="cms-search-panel" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
    <div className="cms-basic-filters">
      {module === 'projects' ? <><FilterField label="Project name"><input type="search" aria-label="Project name" {...commonProps('name')} /></FilterField><FilterField label="Owner"><input type="search" aria-label="Owner name or email" {...commonProps('owner')} /></FilterField><FilterField label="Status"><select aria-label="Project status" {...commonProps('status')}><option value="">All statuses</option>{['Creating', 'Starting', 'Running', 'Stopping', 'Stopped', 'Deleting', 'Failed'].map((status) => <option key={status}>{status}</option>)}</select></FilterField></> : null}
      {module === 'configuration' ? <><FilterField label="Group"><input type="search" aria-label="Configuration group" {...commonProps('group')} /></FilterField><FilterField label="Item key"><input type="search" aria-label="Configuration item key" {...commonProps('key')} /></FilterField><FilterField label="Item name"><input type="search" aria-label="Configuration item name" {...commonProps('name')} /></FilterField></> : null}
      {module === 'users' ? <><FilterField label="Name"><input type="search" aria-label="User name" {...commonProps('name')} /></FilterField><FilterField label="Email"><input type="search" aria-label="User email" {...commonProps('email')} /></FilterField><FilterField label="Role"><select aria-label="User role" {...commonProps('role')}><option value="">All roles</option><option>Member</option><option>Administrator</option></select></FilterField></> : null}
      {module === 'audit' ? <><FilterField label="User"><input type="search" aria-label="Audit user" {...commonProps('user')} /></FilterField><FilterField label="Action"><input type="search" aria-label="Audit action" {...commonProps('action')} /></FilterField><FilterField label="Resource"><input type="search" aria-label="Audit resource" {...commonProps('resource')} /></FilterField></> : null}
    </div>
    {advanced ? <div className="cms-advanced-filters">
      {module === 'projects' ? <><FilterField label="Workspace ID"><input type="search" aria-label="Workspace ID" {...commonProps('workspaceId')} /></FilterField><FilterField label="Created from"><input type="date" aria-label="Project created from" {...commonProps('createdFrom')} /></FilterField><FilterField label="Created to"><input type="date" aria-label="Project created to" {...commonProps('createdTo')} /></FilterField></> : null}
      {module === 'configuration' ? <><FilterField label="Value type"><select aria-label="Configuration value type" {...commonProps('valueType')}><option value="">All types</option><option value="string">String</option><option value="number">Number</option><option value="boolean">Boolean</option></select></FilterField><FilterField label="Mutable"><select aria-label="Configuration mutability" {...commonProps('isMutable')}><option value="">Any</option><option value="true">Mutable</option><option value="false">Read only</option></select></FilterField><FilterField label="Group state"><select aria-label="Configuration group state" {...commonProps('isActive')}><option value="">Any</option><option value="true">Active</option><option value="false">Inactive</option></select></FilterField></> : null}
      {module === 'users' ? <><FilterField label="Coder username"><input type="search" aria-label="Coder username" {...commonProps('coderUsername')} /></FilterField><FilterField label="Created from"><input type="date" aria-label="User created from" {...commonProps('createdFrom')} /></FilterField><FilterField label="Created to"><input type="date" aria-label="User created to" {...commonProps('createdTo')} /></FilterField></> : null}
      {module === 'audit' ? <><FilterField label="Actor type"><select aria-label="Actor type" {...commonProps('actorType')}><option value="">All actor types</option><option>User</option><option>System</option></select></FilterField><FilterField label="User role"><select aria-label="Audit user role" {...commonProps('userRole')}><option value="">All user roles</option><option>Member</option><option>Administrator</option></select></FilterField><FilterField label="Outcome"><select aria-label="Audit outcome" {...commonProps('outcome')}><option value="">All outcomes</option><option>Success</option><option>Failure</option></select></FilterField><FilterField label="Request ID"><input type="search" aria-label="Audit request ID" {...commonProps('requestId')} /></FilterField><FilterField label="Date from"><input type="date" aria-label="Audit date from" {...commonProps('dateFrom')} /></FilterField><FilterField label="Date to"><input type="date" aria-label="Audit date to" {...commonProps('dateTo')} /></FilterField></> : null}
    </div> : null}
    <div className="cms-search-actions"><button type="submit" className="button button-primary">Search</button><button type="button" className="button button-secondary" onClick={onAdvanced} aria-expanded={advanced}>{advanced ? 'Hide advanced search' : 'Advanced search'}</button><button type="button" className="text-button" onClick={onReset}>Reset</button></div>
  </form>;
}

function ConfigurationRow({ item, onSaved }: { item: ConfigurationItem; onSaved: (item: ConfigurationItem) => void }) {
  const [value, setValue] = useState(item.value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setError(null);
    try { onSaved(await api.updateConfiguration(item.key, value)); } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not save configuration.'); } finally { setBusy(false); }
  };
  useEffect(() => setValue(item.value), [item.value]);
  return <tr><td><strong>{item.displayName}</strong><small>{item.description || 'No description'}</small></td><td className="mono">{item.key}</td><td>{item.valueType}</td><td>{item.isMutable && !item.isSensitive ? <div className="config-edit"><input aria-label={`Value for ${item.displayName}`} value={value} onChange={(event) => setValue(event.target.value)} /><button className="button button-secondary" disabled={busy || value === item.value} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button></div> : <span>{item.isSensitive ? 'Managed secret' : item.value}</span>}{error ? <small className="card-error">{error}</small> : null}</td></tr>;
}

function ProjectCreatePanel({ onCreated, onClose }: { onCreated: (project: Project) => void; onClose: () => void }) {
  const [owners, setOwners] = useState<User[]>([]);
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createAttempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const ownerRequest = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const findOwners = async (identity = '') => {
    const request = ++ownerRequest.current;
    try {
      const result = await api.userPage(identity ? { identity } : {}, 1, 20);
      if (!acceptsOwnerResponse(request, ownerRequest.current)) return;
      setOwners(result.items);
      setOwnerId((current) => result.items.some((owner) => owner.id === current) ? current : result.items[0]?.id || '');
    } catch (caught) { if (acceptsOwnerResponse(request, ownerRequest.current)) setError(caught instanceof ApiError ? caught.message : 'Could not load users.'); }
  };
  useEffect(() => { void findOwners(); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    const payload = { ownerId, name: name.trim(), description: description.trim() || undefined };
    createAttempt.current = nextCreateAttempt(createAttempt.current, payload);
    try { onCreated(await api.adminCreateProject(payload, createAttempt.current.key)); } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Could not create project.'); } finally { setBusy(false); }
  };
  return <div className="cms-editor-panel"><div><h2>Create project</h2><p className="muted">Provision the approved template for a selected user.</p></div><form onSubmit={submit}><FilterField label="Find owner"><div className="owner-search"><input type="search" aria-label="Find project owner" value={ownerQuery} onChange={(event) => setOwnerQuery(event.target.value)} /><button type="button" className="button button-secondary" onClick={() => void findOwners(ownerQuery)}>Find</button></div></FilterField><FilterField label="Owner"><select aria-label="Project owner" required value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} · {owner.email}</option>)}</select></FilterField><FilterField label="New project name"><input aria-label="New project name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></FilterField><FilterField label="Description"><textarea maxLength={500} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></FilterField>{error ? <small className="card-error">{error}</small> : null}<div className="cms-editor-actions"><button className="button button-primary" disabled={busy || !ownerId}>{busy ? 'Creating…' : 'Create project'}</button><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button></div></form></div>;
}

export function AdminPage() {
  const [module, setModule] = useState<AdminModule>('overview');
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<ConfigurationGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [draftFilters, setDraftFilters] = useState<CmsFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<CmsFilters>({});
  const [advanced, setAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refresh, setRefresh] = useState(0);
  const [creatingProject, setCreatingProject] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        if (module === 'overview') { const result = await api.adminOverview(); if (active) setOverview(result); }
        if (module === 'projects') {
          const result = await api.adminProjectPage(appliedFilters, page, pageSize);
          if (active) { setProjects(result.items); setTotal(result.total); }
        }
        if (module === 'configuration') { const result = await api.configurationGroupPage(appliedFilters, page, pageSize); if (active) { setGroups(result.items); setTotal(result.total); } }
        if (module === 'users') {
          const [result, roleResult] = await Promise.all([api.userPage(appliedFilters, page, pageSize), api.listRoles()]);
          if (active) { setUsers(result.items); setRoles(roleResult); setTotal(result.total); }
        }
        if (module === 'audit') { const result = await api.auditPage(appliedFilters, page, pageSize); if (active) { setAudit(result.items); setTotal(result.total); } }
      } catch (caught) { if (active) setError(caught); } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [module, appliedFilters, page, refresh]);

  useEffect(() => {
    const validPage = clampCmsPage(page, total, pageSize);
    if (!loading && page !== validPage) setPage(validPage);
  }, [loading, page, total]);

  const switchModule = (next: AdminModule) => { setModule(next); setDraftFilters({}); setAppliedFilters({}); setAdvanced(false); setPage(1); setCreatingProject(false); };
  const applySearch = () => { setPage(1); setAppliedFilters({ ...draftFilters }); };
  const resetSearch = () => { setDraftFilters({}); setAppliedFilters({}); setPage(1); };
  const reload = () => setRefresh((current) => current + 1);
  const control = async (project: Project, action: 'start' | 'stop' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Delete “${project.name}” and its workspace?`)) return;
    try { action === 'delete' ? await api.adminDeleteProject(project.id) : await api.adminSetLifecycle(project.id, action); reload(); } catch (caught) { setError(caught); }
  };
  const changeRole = async (user: User, role: UserRole) => {
    try { await api.updateUserRole(user.id, role); reload(); } catch (caught) { setError(caught); }
  };
  const updateConfiguration = (updated: ConfigurationItem) => setGroups((current) => current.map((group) => ({ ...group, items: group.items.map((item) => item.id === updated.id ? updated : item) })));
  const title = modules.find(([key]) => key === module)?.[1] || 'Administration';

  return <div className="admin-page"><aside className="admin-sidebar"><p className="eyebrow">ADMIN CMS</p><strong>Platform control</strong><nav>{modules.map(([key, label]) => <button key={key} className={module === key ? 'active' : ''} onClick={() => switchModule(key)}>{label}</button>)}</nav></aside><div className="admin-content">
    <div className="page-heading"><div><p className="eyebrow">PLATFORM CONTROL</p><h1>{title}</h1><p className="muted">Manage users, projects, policy, and operational evidence.</p></div><div className="cms-heading-actions">{module === 'projects' ? <button className="button button-primary" onClick={() => setCreatingProject(true)}>＋ Create project</button> : null}<button className="button button-secondary" onClick={reload}>↻ Refresh</button></div></div>
    {module !== 'overview' ? <SearchPanel module={module} filters={draftFilters} advanced={advanced} onFilters={setDraftFilters} onAdvanced={() => setAdvanced((current) => !current)} onSearch={applySearch} onReset={resetSearch} /> : null}
    {creatingProject ? <ProjectCreatePanel onCreated={() => { setCreatingProject(false); reload(); }} onClose={() => setCreatingProject(false)} /> : null}
    {loading ? <div className="loading-card"><span className="spinner" />Loading {title.toLowerCase()}…</div> : null}
    {error ? <ErrorBanner error={error} onRetry={() => { setError(null); reload(); }} /> : null}
    {!loading && module === 'overview' && overview ? <div className="admin-metrics">{Object.entries(overview).map(([key, value]) => <div key={key}><strong>{value}</strong><span>{key.replace(/([A-Z])/g, ' $1')}</span></div>)}</div> : null}
    {!loading && module === 'projects' ? <section className="admin-section"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Project</th><th>Owner</th><th>Status</th><th>Created</th><th>Control</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id}><td><strong>{project.name}</strong><small>{project.workspaceId}</small></td><td>{project.owner?.name || 'Unknown'}<small>{project.owner?.email}</small></td><td><StatusPill status={project.status} /></td><td>{new Date(project.createdAt).toLocaleString()}</td><td className="admin-actions">{project.status === 'Stopped' || project.status === 'Failed' ? <button className="text-button" onClick={() => void control(project, 'start')}>Start</button> : <button className="text-button" disabled={['Creating', 'Starting', 'Stopping', 'Deleting'].includes(project.status)} onClick={() => void control(project, 'stop')}>Stop</button>}<button className="text-button danger-button" onClick={() => void control(project, 'delete')}>Delete</button></td></tr>)}</tbody></table></div><Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} /></section> : null}
    {!loading && module === 'configuration' ? <section className="admin-section config-groups">{groups.map((group) => <article className="config-group-card" key={group.id}><header><div><h2>{group.name}</h2><p>{group.description || 'No description'}</p></div><div><span className={`group-state ${group.isActive ? 'active' : ''}`}>{group.isActive ? 'Active' : 'Inactive'}</span><small className="mono">{group.key}</small></div></header><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Configuration item</th><th>Key</th><th>Type</th><th>Value</th></tr></thead><tbody>{group.items.map((item) => <ConfigurationRow key={item.id} item={item} onSaved={updateConfiguration} />)}</tbody></table></div></article>)}<Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} /></section> : null}
    {!loading && module === 'users' ? <section className="admin-section"><div className="role-summary">{roles.map((role) => <article key={role.role}><strong>{role.role}</strong><span>{role.userCount} users</span><p>{role.description}</p></article>)}</div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Coder identity</th><th>Created</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong></td><td>{user.email}</td><td><select aria-label={`Role for ${user.name}`} value={user.role} onChange={(event) => void changeRole(user, event.target.value as UserRole)}><option>Member</option><option>Administrator</option></select></td><td className="mono">{user.coderUsername || '—'}</td><td>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</td></tr>)}</tbody></table></div><Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} /></section> : null}
    {!loading && module === 'audit' ? <section className="admin-section"><div className="admin-table-wrap"><table className="admin-table audit-table"><thead><tr><th>Date/time</th><th>User</th><th>Actor type</th><th>User role</th><th>Action</th><th>Resource</th><th>Outcome</th></tr></thead><tbody>{audit.map((entry) => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString()}</td><td>{entry.actorUser ? <><strong>{entry.actorUser.name}</strong><small>{entry.actorUser.email}</small></> : '—'}</td><td>{entry.actorType}</td><td>{entry.actorRole || '—'}</td><td className="mono">{entry.action}</td><td>{entry.resourceType}{entry.resourceId ? <small className="mono">{entry.resourceId}</small> : null}</td><td>{entry.outcome}</td></tr>)}</tbody></table></div><Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} /></section> : null}
  </div></div>;
}
