'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Languages, Download, Trash2, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Pack {
  from_code: string;
  to_code: string;
  from_name: string;
  to_name: string;
  installed: boolean;
}

export default function LanguagesPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch('/api/admin/languages');
      if (!r.ok) { setMsg('Could not reach the translation service.'); setPacks([]); return; }
      setPacks(((await r.json()).packages ?? []) as Pack[]);
    } catch {
      setMsg('Could not reach the translation service.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(p: Pack, action: 'install' | 'uninstall') {
    const key = `${p.from_code}-${p.to_code}`;
    setBusyKey(key);
    setMsg(null);
    try {
      const r = await fetch('/api/admin/languages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, from: p.from_code, to: p.to_code }),
      });
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string };
        setMsg(e.error ?? `${action} failed.`);
      } else {
        setPacks((prev) => prev.map((x) =>
          x.from_code === p.from_code && x.to_code === p.to_code ? { ...x, installed: action === 'install' } : x));
      }
    } catch {
      setMsg('Request failed.');
    } finally {
      setBusyKey(null);
    }
  }

  const installed = useMemo(() => packs.filter((p) => p.installed), [packs]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const avail = packs.filter((p) => !p.installed);
    if (!q) return avail.slice(0, 40); // cap when unfiltered — the catalogue is large
    return avail.filter((p) =>
      `${p.from_name} ${p.to_name} ${p.from_code} ${p.to_code}`.toLowerCase().includes(q));
  }, [packs, query]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Languages className="size-6 text-[var(--brand)]" /> Languages
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          The translation “language bank”. Install packs to add languages to the Document Translator —
          each is downloaded to the server once and works offline thereafter. Argos pivots through
          English, so an X↔English pair enables translating between any installed languages.
        </p>
      </div>

      {msg && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">{msg}</div>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Loader2 className="size-4 animate-spin" /> Loading…</p>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Installed ({installed.length})</h2>
            {installed.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No packs installed yet.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {installed.map((p) => (
                  <PackRow key={`${p.from_code}-${p.to_code}`} p={p} busy={busyKey === `${p.from_code}-${p.to_code}`} onAct={act} />
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Available</h2>
            <label className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search languages (e.g. German, sw)…"
                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm"
              />
            </label>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filtered.map((p) => (
                <PackRow key={`${p.from_code}-${p.to_code}`} p={p} busy={busyKey === `${p.from_code}-${p.to_code}`} onAct={act} />
              ))}
            </ul>
            {!query && <p className="text-xs text-[var(--muted-foreground)]">Showing the first 40 — search to find a specific language.</p>}
          </section>
        </>
      )}
    </div>
  );
}

function PackRow({ p, busy, onAct }: { p: Pack; busy: boolean; onAct: (p: Pack, a: 'install' | 'uninstall') => void }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
      <span className="min-w-0 truncate">{p.from_name} → {p.to_name}</span>
      {p.installed ? (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => onAct(p, 'uninstall')}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Remove
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onAct(p, 'install')}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Install
        </Button>
      )}
    </li>
  );
}
