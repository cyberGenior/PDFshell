'use client';

import { useState } from 'react';
import {
  protectViaService,
  unlockViaService,
  ServiceUnavailableError,
  WrongPasswordError,
} from '@/lib/libreoffice';
import { usePendingDoc } from '@/lib/handoff';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { SendToTools } from '@/components/pdf/SendToTools';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes, cn } from '@/lib/utils';
import { track } from '@/lib/track';
import { Lock, LockOpen } from 'lucide-react';

type Mode = 'protect' | 'unlock';

export default function ProtectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>('protect');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  function reset(next: File | null) {
    setFile(next);
    setPassword('');
    setConfirm('');
    setError(null);
    setServiceDown(false);
    setResult(null);
  }

  usePendingDoc((f) => reset(f));

  const mismatched = mode === 'protect' && confirm.length > 0 && password !== confirm;
  const ready =
    !!file && password.length >= 4 && (mode === 'unlock' || password === confirm);

  async function run() {
    if (!file || !ready) return;
    setBusy(true);
    setError(null);
    setServiceDown(false);
    setResult(null);
    track('tool_used', mode);
    try {
      const bytes =
        mode === 'protect'
          ? await protectViaService(file, password)
          : await unlockViaService(file, password);
      const suffix = mode === 'protect' ? '_protected.pdf' : '_unlocked.pdf';
      const name = file.name.replace(/\.pdf$/i, '') + suffix;
      downloadBlob(bytes, name);
      setResult({ bytes, name });
      track('conversion', mode);
    } catch (err) {
      if (err instanceof ServiceUnavailableError) setServiceDown(true);
      else if (err instanceof WrongPasswordError) setError(err.message);
      else setError(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell slug="protect">
      <ProcessingOverlay
        show={busy}
        label={mode === 'protect' ? 'Encrypting your PDF…' : 'Removing the password…'}
        sublabel="Processed on your server, then deleted"
      />
      {!file ? (
        <DropZone onFiles={(f) => reset(f[0] ?? null)} multiple={false} label="Drop a PDF to protect or unlock" />
      ) : (
        <div className="flex max-w-xl flex-col gap-5">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => reset(null)}>Change</Button>
          </div>

          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-sm" role="tablist">
            {(
              [
                { value: 'protect', label: 'Protect', icon: Lock },
                { value: 'unlock', label: 'Unlock', icon: LockOpen },
              ] as const
            ).map((m) => (
              <button
                key={m.value}
                role="tab"
                aria-selected={mode === m.value}
                onClick={() => { setMode(m.value); setError(null); setResult(null); }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5',
                  mode === m.value ? 'bg-[var(--surface-2)] font-medium' : 'text-[var(--muted-foreground)]',
                )}
              >
                <m.icon className="size-4" /> {m.label}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">
              {mode === 'protect' ? 'Password to set (min 4 characters)' : 'Current password'}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setResult(null); }}
              autoComplete="new-password"
              className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3"
            />
          </label>

          {mode === 'protect' && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Confirm password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setResult(null); }}
                autoComplete="new-password"
                aria-invalid={mismatched}
                className={cn(
                  'h-10 rounded-md border bg-[var(--background)] px-3',
                  mismatched ? 'border-red-500' : 'border-[var(--border)]',
                )}
              />
              {mismatched && <span className="text-xs text-red-500">Passwords don’t match.</span>}
            </label>
          )}

          {mode === 'protect' && (
            <p className="text-xs text-[var(--muted-foreground)]">
              The file is encrypted with AES-256. Keep the password safe — it cannot be recovered.
            </p>
          )}

          {serviceDown && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
              <p className="font-medium">The processing service isn’t running.</p>
              <p className="mt-1 text-red-500/90">
                Start it with <code className="rounded bg-black/10 px-1 dark:bg-white/10">docker compose up convert</code>.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={run} disabled={busy || !ready}>
              {busy ? 'Working…' : mode === 'protect' ? 'Protect & download' : 'Unlock & download'}
            </Button>
          </div>

          {result && <SendToTools bytes={result.bytes} name={result.name} exclude="protect" />}
        </div>
      )}
    </ToolShell>
  );
}
