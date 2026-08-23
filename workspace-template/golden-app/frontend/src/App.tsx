import { FormEvent, useEffect, useState } from 'react';

type RequestRecord = { id: string; title: string; description: string | null; status: 'Open' | 'In Progress' | 'Done'; created_at: string; updated_at: string };
const apiBase = import.meta.env.VITE_API_BASE || '/api';

export default function App() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/requests`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      setRequests(await response.json() as RequestRecord[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request API is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/requests`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, description }) });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      setTitle('');
      setDescription('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const update = async (request: RequestRecord, status: RequestRecord['status']) => {
    const response = await fetch(`${apiBase}/requests/${request.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!response.ok) { setError(`API returned ${response.status}`); return; }
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
  };

  return <main className="app">
    <header><p className="eyebrow">GOLDEN VIBE CODE PROJECT</p><h1>Internal Request Tracker</h1><p className="lede">A real React + FastAPI application backed by workspace-local SQLite.</p></header>
    {error && <div className="error" role="alert"><strong>Something needs attention.</strong><span>{error}</span><button onClick={() => void load()}>Retry</button></div>}
    <div className="layout"><section className="list"><div className="section-title"><h2>{requests.length ? `${requests.length} request${requests.length === 1 ? '' : 's'}` : 'No requests yet'}</h2><button className="refresh" onClick={() => void load()}>Refresh</button></div>{loading ? <p className="state">Loading requests…</p> : requests.length === 0 ? <p className="state">Your queue is clear. Add the first request.</p> : <div className="items">{requests.map((request) => <article className="item" key={request.id}><div><h3>{request.title}</h3>{request.description && <p>{request.description}</p>}</div><select value={request.status} onChange={(event) => void update(request, event.target.value as RequestRecord['status'])}><option>Open</option><option>In Progress</option><option>Done</option></select></article>)}</div>}</section><section className="form-card"><h2>New request</h2><form onSubmit={create}><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="What needs attention?" /></label><label>Details<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder="Add useful context" /></label><button disabled={saving}>{saving ? 'Saving…' : 'Create request'}</button></form></section></div>
  </main>;
}
