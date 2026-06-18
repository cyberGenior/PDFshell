import { ShieldCheck } from 'lucide-react';

/**
 * A small, persistent reassurance about how the file is handled — shown next to
 * the active file so the privacy promise doesn't fade once a user is deep in a
 * tool. 'device' = never uploaded; 'server' = processed then deleted.
 */
export function PrivacyNote({ mode }: { mode: 'device' | 'server' }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
      <ShieldCheck className="size-3.5 shrink-0 text-[oklch(0.6_0.13_160)]" />
      {mode === 'device'
        ? 'Processed entirely on your device — your file is never uploaded.'
        : 'Processed on your own server and deleted right after — never stored.'}
    </p>
  );
}
