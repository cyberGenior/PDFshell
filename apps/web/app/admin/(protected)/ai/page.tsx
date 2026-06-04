'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sparkles, Check, Trash2, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Model {
  id: number;
  label: string;
  provider: string;
  base_url: string;
  model: string;
  key_masked: string;
  is_active: number;
}

const PROVIDER_DEFAULTS: Record<string, string> = {
  ollama: 'http://host.docker.internal:11434',
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  custom: '',
};

export default function AiModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [form, setForm] = useState({ label: '', provider: 'ollama', baseUrl: PROVIDER_DEFAULTS.ollama, model: '', apiKey: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/ai');
    if (res.ok) setModels((await res.json()).models);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch('/api/admin/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error ?? 'Failed.');
    setForm({ label: '', provider: 'ollama', baseUrl: PROVIDER_DEFAULTS.ollama, model: '', apiKey: '' });
    void load();
  }

  async function action(id: number, act: 'activate' | 'delete' | 'test') {
    const res = await fetch('/api/admin/ai/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: act, id }),
    });
    const data = await res.json();
    if (act === 'test') setTestResult((p) => ({ ...p, [id]: data.ok ? `✓ ${data.detail}` : `✕ ${data.detail}` }));
    else void load();
  }

  const input = 'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight">AI Models</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Add a model, set one active — the whole app (AI conversions) uses the active model. Keys are encrypted at rest.
        </p>
      </div>

      {/* Model cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {models.map((m) => (
          <div
            key={m.id}
            className={`card-shadow rounded-2xl border bg-[var(--card)] p-5 ${m.is_active ? 'border-[var(--brand)] ring-1 ring-[var(--brand)]' : 'border-[var(--border)]'}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-[var(--brand)]" /> {m.label}
              </span>
              {m.is_active === 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand)] px-2 py-0.5 text-[11px] font-medium text-white">
                  <Check className="size-3" /> Active
                </span>
              )}
            </div>
            <dl className="space-y-1 text-sm">
              <Row k="Provider" v={m.provider} />
              <Row k="Model" v={m.model} />
              <Row k="Endpoint" v={m.base_url} />
              <Row k="API key" v={m.key_masked || '—'} />
            </dl>
            {testResult[m.id] && <p className="mt-2 text-xs text-[var(--muted-foreground)]">{testResult[m.id]}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {m.is_active !== 1 && <Button size="sm" onClick={() => action(m.id, 'activate')}>Set active</Button>}
              <Button size="sm" variant="outline" onClick={() => action(m.id, 'test')}><Plug className="size-3.5" /> Test</Button>
              <Button size="sm" variant="ghost" onClick={() => action(m.id, 'delete')}><Trash2 className="size-3.5" /></Button>
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">No models yet — add one below.</p>
        )}
      </div>

      {/* Add form */}
      <form onSubmit={add} className="card-shadow flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-semibold">Add a model</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={input} placeholder="Label (e.g. Local Llama)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <select
            className={input}
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value, baseUrl: PROVIDER_DEFAULTS[e.target.value] ?? '' })}
          >
            <option value="ollama">Ollama (local)</option>
            <option value="openai">OpenAI / compatible</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">Custom</option>
          </select>
          <input className={input} placeholder="Base URL" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
          <input className={input} placeholder="Model id (e.g. llama3.2:3b)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          {form.provider !== 'ollama' && (
            <input className={input} type="password" placeholder="API key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
          )}
        </div>
        {msg && <p className="text-sm text-red-500">{msg}</p>}
        <Button type="submit" className="w-fit">Add model</Button>
      </form>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--muted-foreground)]">{k}</dt>
      <dd className="truncate font-medium" title={v}>{v}</dd>
    </div>
  );
}
