import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App, waitForProjectRunning } from './App';
import { api, Project } from './api';

describe('portal entry journey', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it('starts on the local named-user sign-in screen', () => {
    window.sessionStorage.clear();
    render(<App />);

    expect(screen.getByRole('heading', { name: /sign in to your workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue as alex chen/i })).toBeInTheDocument();
    expect(screen.queryByText(/company sso/i)).not.toBeInTheDocument();
  });

  it('clears the portal session on logout', async () => {
    window.sessionStorage.setItem('vibe-token', 'test-token');
    window.sessionStorage.setItem('vibe-user', JSON.stringify({ id: 'user-1', name: 'Alex Chen', email: 'alex@example.test' }));
    render(<App />);

    await userEvent.setup().click(screen.getByRole('button', { name: /log out/i }));

    expect(screen.getByRole('heading', { name: /sign in to your workspace/i })).toBeInTheDocument();
    expect(window.sessionStorage.getItem('vibe-token')).toBeNull();
    expect(window.sessionStorage.getItem('vibe-user')).toBeNull();
  });

  it('shows the administrator control panel only for an administrator session', async () => {
    window.sessionStorage.setItem('vibe-token', 'test-token');
    window.sessionStorage.setItem('vibe-user', JSON.stringify({ id: 'admin-1', name: 'Avery Morgan', email: 'avery.admin@example.test', role: 'Administrator' }));
    window.history.pushState({}, '', '/admin');
    vi.spyOn(api, 'adminOverview').mockResolvedValue({ projects: 1, creating: 0, running: 1, stopped: 0, failed: 0 });
    vi.spyOn(api, 'adminProjectPage').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    vi.spyOn(api, 'configurationPage').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    vi.spyOn(api, 'configurationGroupPage').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    vi.spyOn(api, 'auditPage').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const administrator = { id: 'admin-1', name: 'Avery Morgan', email: 'avery.admin@example.test', role: 'Administrator' as const };
    vi.spyOn(api, 'userPage').mockResolvedValue({ items: [administrator], total: 1, page: 1, pageSize: 20 });
    vi.spyOn(api, 'listRoles').mockResolvedValue([]);
    const updateUserRole = vi.spyOn(api, 'updateUserRole').mockResolvedValue({ ...administrator, role: 'Member' });
    const adminCreateProject = vi.spyOn(api, 'adminCreateProject').mockResolvedValue({ id: 'project-admin', name: 'Admin-created app', status: 'Creating' } as Project);
    render(<App />);

    expect(await screen.findByRole('heading', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /users & roles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^configuration$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /configuration groups/i })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /^projects$/i }));
    expect(await screen.findByRole('button', { name: /create project/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/owner name or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/project status/i)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /advanced search/i }));
    expect(screen.getByLabelText(/workspace id/i)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /create project/i }));
    await screen.findByRole('combobox', { name: /project owner/i });
    await userEvent.setup().type(screen.getByLabelText(/new project name/i), 'Admin-created app');
    await userEvent.setup().click(screen.getByRole('button', { name: /^create project$/i }));
    await vi.waitFor(() => expect(adminCreateProject).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'admin-1', name: 'Admin-created app' }), expect.any(String)));
    await userEvent.setup().click(screen.getByRole('button', { name: /users & roles/i }));
    expect(await screen.findByRole('columnheader', { name: /^user$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^role$/i })).toBeInTheDocument();
    const userPageCalls = vi.mocked(api.userPage).mock.calls.length;
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: /role for avery morgan/i }), 'Member');
    await vi.waitFor(() => expect(updateUserRole).toHaveBeenCalledWith('admin-1', 'Member'));
    await vi.waitFor(() => expect(vi.mocked(api.userPage).mock.calls.length).toBeGreaterThan(userPageCalls));
    await userEvent.setup().click(screen.getByRole('button', { name: /audit log/i }));
    expect(await screen.findByRole('columnheader', { name: /date\/time/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^user$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /actor type/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /user role/i })).toBeInTheDocument();
  });

  it('retries a failed named-user login', async () => {
    window.sessionStorage.clear();
    const demoLogin = vi.spyOn(api, 'demoLogin')
      .mockRejectedValueOnce(new Error('temporary identity failure'))
      .mockResolvedValueOnce({ token: 'test-token', user: { id: 'user-1', name: 'Alex Chen', email: 'alex@example.test' } });
    render(<App />);

    await userEvent.setup().click(screen.getByRole('button', { name: /continue as alex chen/i }));
    await screen.findByRole('alert');
    await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }));

    await vi.waitFor(() => expect(demoLogin).toHaveBeenCalledTimes(2));
    expect(demoLogin.mock.calls[0][0]).toBe(demoLogin.mock.calls[1][0]);
  });

  it('waits for a starting workspace to become Running before opening it', async () => {
    vi.useFakeTimers();
    const creating = { id: 'project-1', status: 'Creating' } as Project;
    const running = { ...creating, status: 'Running' } as Project;
    vi.spyOn(api, 'getProject').mockResolvedValue(running);

    const result = waitForProjectRunning('project-1', creating);
    await vi.advanceTimersByTimeAsync(800);

    await expect(result).resolves.toBe(running);
  });

  it('keeps the local API preview inside the authenticated portal', async () => {
    window.sessionStorage.setItem('vibe-token', 'test-token');
    window.sessionStorage.setItem('vibe-user', JSON.stringify({ id: 'user-1', name: 'Alex Chen', email: 'alex@example.test' }));
    window.history.pushState({}, '', '/projects/project-1');
    const project = {
      id: 'project-1', name: 'Tracker', description: null, status: 'Running', workspaceId: 'local-project-1',
      workspaceUrl: 'http://localhost:5173/workspaces/project-1', frontendPreviewUrl: 'http://localhost:5173/preview/project-1',
      apiPreviewUrl: 'http://localhost:5173/api-preview/project-1', sourceRepository: 'local://project-1',
      currentCommit: 'a'.repeat(40), lastKnownError: null, lastOpenedAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), template: { id: 'golden', name: 'Golden', version: '1.0.0' },
    } as Project;
    vi.spyOn(api, 'getProject').mockResolvedValue(project);
    vi.spyOn(api, 'listRequests').mockResolvedValue([]);
    render(<App />);

    const apiPreview = await screen.findByRole('link', { name: /api preview/i });
    expect(apiPreview).toHaveAttribute('href', 'http://localhost:5173/api-preview/project-1');

    cleanup();
    window.history.pushState({}, '', '/api-preview/project-1');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /api response/i })).toBeInTheDocument();
    expect(screen.getByText(/session to the local project API preview/i)).toBeInTheDocument();
  });

  it('shows the workspace action on the project list', async () => {
    window.sessionStorage.setItem('vibe-token', 'test-token');
    window.sessionStorage.setItem('vibe-user', JSON.stringify({ id: 'user-1', name: 'Alex Chen', email: 'alex@example.test' }));
    window.history.pushState({}, '', '/projects');
    vi.spyOn(api, 'listProjects').mockResolvedValue([{
      id: 'project-1', name: 'Tracker', description: null, status: 'Running', workspaceId: 'local-project-1',
      workspaceUrl: 'http://localhost:5173/workspaces/project-1', frontendPreviewUrl: 'http://localhost:5173/preview/project-1',
      apiPreviewUrl: 'http://localhost:5173/api-preview/project-1', sourceRepository: 'local://project-1', currentCommit: 'a'.repeat(40),
      lastKnownError: null, lastOpenedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      template: { id: 'golden', name: 'Golden', version: '1.0.0' },
    } as Project]);
    render(<App />);

    expect(await screen.findByRole('link', { name: /open workspace/i })).toBeInTheDocument();
  });

  it('shows a retryable provider error on a project card', async () => {
    window.sessionStorage.setItem('vibe-token', 'test-token');
    window.sessionStorage.setItem('vibe-user', JSON.stringify({ id: 'user-1', name: 'Alex Chen', email: 'alex@example.test' }));
    window.history.pushState({}, '', '/projects');
    vi.spyOn(api, 'listProjects').mockResolvedValue([{
      id: 'project-1', name: 'Tracker', description: null, status: 'Running', workspaceId: 'coder-project-1',
      workspaceUrl: 'https://coder.example.test/workspace', frontendPreviewUrl: 'https://coder.example.test/frontend', apiPreviewUrl: 'https://coder.example.test/api',
      sourceRepository: null, currentCommit: null, lastKnownError: 'Coder gateway unavailable (request request-1)', lastOpenedAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), template: { id: 'golden', name: 'Golden', version: '1.0.0' },
    } as Project]);
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/coder gateway unavailable/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retries a failed project detail load', async () => {
    window.sessionStorage.setItem('vibe-token', 'test-token');
    window.sessionStorage.setItem('vibe-user', JSON.stringify({ id: 'user-1', name: 'Alex Chen', email: 'alex@example.test' }));
    window.history.pushState({}, '', '/projects/project-1');
    const project = {
      id: 'project-1', name: 'Tracker', description: null, status: 'Running', workspaceId: 'local-project-1',
      workspaceUrl: 'http://localhost:5173/workspaces/project-1', frontendPreviewUrl: 'http://localhost:5173/preview/project-1',
      apiPreviewUrl: 'http://localhost:5173/api-preview/project-1', sourceRepository: 'local://project-1', currentCommit: 'a'.repeat(40),
      lastKnownError: null, lastOpenedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      template: { id: 'golden', name: 'Golden', version: '1.0.0' },
    } as Project;
    const getProject = vi.spyOn(api, 'getProject')
      .mockRejectedValueOnce(new Error('temporary detail failure'))
      .mockResolvedValueOnce(project);
    render(<App />);

    await screen.findByRole('alert');
    await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }));

    await vi.waitFor(() => expect(getProject).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('heading', { name: 'Tracker' })).toBeInTheDocument();
  });

  it('retries a failed project creation with the same idempotency key', async () => {
    window.sessionStorage.setItem('vibe-token', 'test-token');
    window.sessionStorage.setItem('vibe-user', JSON.stringify({ id: 'user-1', name: 'Alex Chen', email: 'alex@example.test' }));
    window.history.pushState({}, '', '/projects/new');
    const project = {
      id: 'project-retry', name: 'request-tracker', description: null, status: 'Creating', workspaceId: 'local-project-retry',
      workspaceUrl: 'http://localhost:5173/workspaces/project-retry', frontendPreviewUrl: 'http://localhost:5173/preview/project-retry',
      apiPreviewUrl: 'http://localhost:5173/api-preview/project-retry', sourceRepository: 'local://project-retry', currentCommit: 'a'.repeat(40),
      lastKnownError: null, lastOpenedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      template: { id: 'golden', name: 'Golden', version: '1.0.0' },
    } as Project;
    const createProject = vi.spyOn(api, 'createProject')
      .mockRejectedValueOnce(new Error('temporary control-plane failure'))
      .mockResolvedValueOnce(project);
    vi.spyOn(api, 'getProject').mockResolvedValue({ ...project, status: 'Running' });
    render(<App />);

    await userEvent.setup().type(screen.getByLabelText(/project name/i), 'request-tracker');
    await userEvent.setup().click(screen.getByRole('button', { name: /create project/i }));
    await screen.findByRole('alert');
    await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }));

    await vi.waitFor(() => expect(createProject).toHaveBeenCalledTimes(2));
    expect(createProject.mock.calls[0][1]).toBe(createProject.mock.calls[1][1]);
  });
});
