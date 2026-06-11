'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Download, Trash2, ArrowRight, FileText } from 'lucide-react';
import { useVault, deleteOutput, clearOutputs, daysLeft, type VaultEntry } from '@/lib/vault';
import { useHandoff } from '@/lib/handoff';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';

/** Lazily render a page-1 thumbnail for a kept PDF. */
function VaultThumb({ entry }: { entry: VaultEntry }) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (entry.mime !== 'application/pdf') return;
    (async () => {
      try {
        const bytes = new Uint8Array(await entry.blob.arrayBuffer());
        const pdf = await loadPdf(bytes);
        try {
          const url = await renderThumbnail(pdf, 1, 64);
          if (!cancelled) setThumb(url);
        } finally {
          await pdf.destroy();
        }
      } catch {
        /* decorative */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entry]);

  return thumb ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={thumb} alt="" className="h-12 w-9 shrink-0 rounded border border-[var(--border)] bg-white object-cover" />
  ) : (
    <span className="grid h-12 w-9 shrink-0 place-items-center rounded border border-[var(--border)] bg-[var(--surface-2)]">
      <FileText className="size-4 text-[var(--muted-foreground)]" />
    </span>
  );
}

/**
 * "Recent files" — the device-local vault of outputs the user chose to keep.
 * Renders nothing unless something has been kept, so it never advertises storage
 * the user didn't opt into.
 */
export function RecentFiles() {
  const { entries, loading } = useVault();
  const router = useRouter();
  const put = useHandoff((s) => s.put);

  if (loading || entries.length === 0) return null;

  function download(entry: VaultEntry) {
    const url = URL.createObjectURL(entry.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = entry.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function reopen(entry: VaultEntry) {
    if (entry.mime !== 'application/pdf') return download(entry);
    const bytes = new Uint8Array(await entry.blob.arrayBuffer());
    put({ bytes, name: entry.name });
    track('tool_used', `vault-reopen:${entry.tool}`);
    router.push('/merge');
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          <Clock className="size-3.5" /> Recent files
        </p>
        <button
          onClick={() => clearOutputs()}
          className="text-xs text-[var(--muted-foreground)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
        >
          Clear all
        </button>
      </div>
      <p className="-mt-1 text-xs text-[var(--muted-foreground)]">
        Kept on this device only — never uploaded, auto-deleted after 7 days.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5"
          >
            <VaultThumb entry={entry} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{entry.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {formatBytes(entry.size)} · expires in {daysLeft(entry)} day{daysLeft(entry) === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="icon-sm" variant="ghost" onClick={() => reopen(entry)} aria-label={`Reopen ${entry.name}`}>
                <ArrowRight />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => download(entry)} aria-label={`Download ${entry.name}`}>
                <Download />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => deleteOutput(entry.id)} aria-label={`Delete ${entry.name}`}>
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
