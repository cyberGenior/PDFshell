'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed.');
      setMsg({ ok: true, text: 'Password updated.' });
      setCurrent('');
      setNext('');
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed.' });
    } finally {
      setBusy(false);
    }
  }

  const input =
    'mb-3 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]';

  return (
    <form onSubmit={submit}>
      <label className="mb-1.5 block text-sm font-medium">Current password</label>
      <input type="password" className={input} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      <label className="mb-1.5 block text-sm font-medium">New password</label>
      <input type="password" className={input} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      {msg && <p className={`mb-3 text-sm ${msg.ok ? 'text-[oklch(0.55_0.15_150)]' : 'text-red-500'}`}>{msg.text}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</Button>
    </form>
  );
}
