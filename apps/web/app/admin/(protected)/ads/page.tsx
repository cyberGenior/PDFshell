'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Trash2, Eye, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Ad {
  id: number;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  link_url: string | null;
  placement: string;
  popup_delay_secs: number;
  popup_frequency: string;
  enabled: number;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
}

const PLACEMENTS = [
  { v: 'landing-banner', label: 'Landing banner' },
  { v: 'landing-grid', label: 'Landing grid' },
  { v: 'sidebar', label: 'Sidebar' },
  { v: 'popup', label: 'Timed popup' },
];

const blank = {
  title: '', body: '', imageUrl: '', ctaLabel: '', linkUrl: '',
  placement: 'landing-banner', popupDelaySecs: '5', popupFrequency: 'session', startsAt: '', endsAt: '',
};

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [form, setForm] = useState({ ...blank });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/ads');
    if (r.ok) setAds((await r.json()).ads);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch('/api/admin/ads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    const d = await r.json();
    if (!r.ok) return setMsg(d.error ?? 'Failed.');
    setForm({ ...blank });
    void load();
  }

  async function action(id: number, act: 'enable' | 'disable' | 'delete') {
    await fetch('/api/admin/ads/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: act, id }) });
    void load();
  }

  const input = 'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight">Ads</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Create ads, choose placement, and track impressions & clicks.</p>
      </div>

      <div className="flex flex-col gap-3">
        {ads.map((a) => {
          const ctr = a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(1) : '0.0';
          return (
            <div key={a.id} className="card-shadow flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <Megaphone className="size-5 shrink-0 text-[var(--brand)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {a.placement}{a.placement === 'popup' && ` · ${a.popup_delay_secs}s · ${a.popup_frequency}`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5" title="Impressions"><Eye className="size-4 text-[var(--muted-foreground)]" /> {a.impressions}</span>
                <span className="flex items-center gap-1.5" title="Clicks"><MousePointerClick className="size-4 text-[var(--muted-foreground)]" /> {a.clicks}</span>
                <span className="tabular-nums text-[var(--muted-foreground)]">{ctr}% CTR</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${a.enabled ? 'bg-[var(--c-mint)] text-[var(--c-mint-ink)]' : 'bg-[var(--surface-2)] text-[var(--muted-foreground)]'}`}>
                {a.enabled ? 'Live' : 'Off'}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => action(a.id, a.enabled ? 'disable' : 'enable')}>
                  {a.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => action(a.id, 'delete')}><Trash2 className="size-3.5" /></Button>
              </div>
            </div>
          );
        })}
        {ads.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No ads yet — create one below.</p>}
      </div>

      <form onSubmit={add} className="card-shadow flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-semibold">Create ad</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className={input} value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}>
            {PLACEMENTS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
          </select>
          <input className={input} placeholder="Body (optional)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <input className={input} placeholder="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <input className={input} placeholder="CTA label (e.g. Learn more)" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
          <input className={input} placeholder="Link URL" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
        </div>
        {form.placement === 'popup' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted-foreground)]">Popup delay (seconds)</span>
              <input className={input} type="number" min={0} value={form.popupDelaySecs} onChange={(e) => setForm({ ...form, popupDelaySecs: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted-foreground)]">Frequency</span>
              <select className={input} value={form.popupFrequency} onChange={(e) => setForm({ ...form, popupFrequency: e.target.value })}>
                <option value="session">Once per session</option>
                <option value="once">Once ever</option>
                <option value="always">Every visit</option>
              </select>
            </label>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block text-[var(--muted-foreground)]">Starts (optional)</span><input className={input} type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block text-[var(--muted-foreground)]">Ends (optional)</span><input className={input} type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label>
        </div>
        {msg && <p className="text-sm text-red-500">{msg}</p>}
        <Button type="submit" className="w-fit">Create ad</Button>
      </form>
    </div>
  );
}
