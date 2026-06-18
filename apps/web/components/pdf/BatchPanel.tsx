'use client';

import { CheckCircle2, AlertCircle, Loader2, FileText, Clock } from 'lucide-react';
import type { BatchItem } from '@/lib/useBatch';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';

const ICON = {
  queued: <Clock className="size-4 text-[var(--muted-foreground)]" />,
  working: <Loader2 className="size-4 animate-spin text-[var(--brand)]" />,
  done: <CheckCircle2 className="size-4 text-[oklch(0.6_0.14_155)]" />,
  error: <AlertCircle className="size-4 text-red-500" />,
};

/**
 * Renders a batch queue: one row per file with its live status, plus a
 * "Download all (ZIP)" action once anything has finished.
 */
export function BatchPanel({
  items, running, doneCount, errorCount, onDownloadZip, zipName,
}: {
  items: BatchItem[];
  running: boolean;
  doneCount: number;
  errorCount: number;
  onDownloadZip: () => void;
  zipName: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
            <span className="shrink-0">{ICON[it.status]}</span>
            <FileText className="size-4 shrink-0 text-[var(--muted-foreground)]" />
            <span className="min-w-0 flex-1 truncate">{it.file.name}</span>
            <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
              {it.status === 'error' ? (it.error ?? 'Failed')
                : it.status === 'done' && it.bytes ? formatBytes(it.bytes.byteLength)
                : it.status === 'working' ? 'Working…'
                : formatBytes(it.file.size)}
            </span>
          </li>
        ))}
      </ul>
      {doneCount > 0 && !running && (
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={onDownloadZip}>Download all ({doneCount}) as ZIP</Button>
          {errorCount > 0 && (
            <span className="text-xs text-red-500">{errorCount} file{errorCount === 1 ? '' : 's'} couldn’t be processed.</span>
          )}
        </div>
      )}
    </div>
  );
}
