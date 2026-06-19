'use client';

import { useState } from 'react';
import {
  protectViaService,
  unlockViaService,
  ServiceUnavailableError,
  WrongPasswordError,
  type PdfPermission,
} from '@/lib/libreoffice';
import { usePendingDoc } from '@/lib/handoff';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { PrivacyNote } from '@/components/pdf/PrivacyNote';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes, isTooLargeForUpload, MAX_UPLOAD_MB, cn } from '@/lib/utils';
import { toast } from '@/lib/useToast';
import { track } from '@/lib/track';
import { Lock, LockOpen } from 'lucide-react';

type Mode = 'protect' | 'unlock';

const PERMISSIONS: { value: PdfPermission; label: string }[] = [
  { value: 'print', label: 'Allow printing' },
  { value: 'copy', label: 'Allow copying text' },
  { value: 'modify', label: 'Allow editing' },
  { value: 'annotate', label: 'Allow comments & form fill' },
];

export default function ProtectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>('protect');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [perms, setPerms] = useState<Record<PdfPermission, boolean>>({
    print: true, copy: true, modify: true, annotate: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  function reset(next: File | null) {
    setFile(next);
    setPassword('');
    setConfirm('');
    setOwnerPassword('');
    setPerms({ print: true, copy: true, modify: true, annotate: true });
    setError(null);
    setServiceDown(false);
    setResult(null);
  }

  usePendingDoc((f) => reset(f));

  const mismatched = mode === 'protect' && confirm.length > 0 && password !== confirm;
  // Any restriction needs a distinct owner password — otherwise the opener is
  // treated as the owner and the limits don't apply.
  const restricted = mode === 'protect' && PERMISSIONS.some((p) => !perms[p.value]);
  const ownerNeeded = restricted && (ownerPassword.length < 4 || ownerPassword === password);
  const ready =
    !!file &&
    password.length >= 4 &&
    (mode === 'unlock' || (password === confirm && !ownerNeeded));

  async function run() {
    if (!file || !ready) return;
    if (isTooLargeForUpload(file)) {
      toast.error(`That file is over ${MAX_UPLOAD_MB} MB — please use a smaller PDF.`);
      return;
    }
    setBusy(true);
    setError(null);
    setServiceDown(false);
    setResult(null);
    track('tool_used', mode);
    try {
      let bytes: Uint8Array;
      if (mode === 'protect') {
        const allowed = PERMISSIONS.filter((p) => perms[p.value]).map((p) => p.value);
        bytes = await protectViaService(file, password, {
          ownerPassword: ownerPassword || undefined,
          // Omit when everything is allowed (server default), so the document is
          // unrestricted exactly as before.
          permissions: allowed.length === PERMISSIONS.length ? undefined : allowed,
        });
      } else {
        bytes = await unlockViaService(file, password);
      }
      const suffix = mode === 'protect' ? '_protected.pdf' : '_unlocked.pdf';
      const name = file.name.replace(/\.pdf$/i, '') + suffix;
      downloadBlob(bytes, name);
      setResult({ bytes, name });
      toast.success('Saved to your device.');
      track('conversion', mode);
    } catch (err) {
      if (err instanceof ServiceUnavailableError) setServiceDown(true);
      else if (err instanceof WrongPasswordError) { setError(err.message); toast.error(err.message); }
      else { setError(err instanceof Error ? err.message : 'Operation failed.'); toast.error('Operation failed.'); }
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
          <PrivacyNote mode="server" />

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
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setResult(null); }}
              autoComplete="new-password"
            />
          </label>

          {mode === 'protect' && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Confirm password</span>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setResult(null); }}
                autoComplete="new-password"
                aria-invalid={mismatched}
              />
              {mismatched && <span className="text-xs text-red-500">Passwords don’t match.</span>}
            </label>
          )}

          {mode === 'protect' && (
            <p className="text-xs text-[var(--muted-foreground)]">
              The file is encrypted with AES-256. Keep the password safe — it cannot be recovered.
            </p>
          )}

          {mode === 'protect' && (
            <fieldset className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <legend className="px-1 text-sm font-medium">Permissions</legend>
              <p className="text-xs text-[var(--muted-foreground)]">
                Choose what readers may do with the document. Unticking an option restricts it.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PERMISSIONS.map((p) => (
                  <label key={p.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={perms[p.value]}
                      onChange={(e) => { setPerms((prev) => ({ ...prev, [p.value]: e.target.checked })); setResult(null); }}
                      className="size-4 accent-[var(--brand)]"
                    />
                    {p.label}
                  </label>
                ))}
              </div>

              {restricted && (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Owner password (to change permissions)</span>
                  <Input
                    type="password"
                    value={ownerPassword}
                    onChange={(e) => { setOwnerPassword(e.target.value); setResult(null); }}
                    autoComplete="new-password"
                    placeholder="Must differ from the open password"
                    className={cn(ownerNeeded && 'border-amber-500')}
                  />
                  {ownerNeeded && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Set an owner password (min 4 chars) different from the open password — otherwise
                      the restrictions won’t apply.
                    </span>
                  )}
                </label>
              )}

              <p className="text-xs text-[var(--muted-foreground)]">
                Note: PDF permissions are honoured by standards-compliant viewers (Acrobat, Preview,
                most browsers) but are <strong>not</strong> cryptographically enforced — determined
                tools can bypass them. For true confidentiality, rely on the open password.
              </p>
            </fieldset>
          )}

          {serviceDown && (
            <Alert variant="warning" title="The processing service is temporarily unavailable.">
              Please try again in a moment.
            </Alert>
          )}
          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex items-center gap-3">
            <Button onClick={run} disabled={busy || !ready}>
              {busy ? 'Working…' : mode === 'protect' ? 'Protect & download' : 'Unlock & download'}
            </Button>
          </div>

          {result && <ResultCard bytes={result.bytes} name={result.name} tool="protect" />}
        </div>
      )}
    </ToolShell>
  );
}
