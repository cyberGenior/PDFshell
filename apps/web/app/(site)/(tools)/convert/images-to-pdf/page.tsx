'use client';

import { useState } from 'react';
import { convertImagesToPdf } from '@/lib/convert';
import { usePendingDocs } from '@/lib/handoff';
import { ConvertHeader } from '@/components/pdf/ConvertHeader';
import { DropZone } from '@/components/pdf/DropZone';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes, outputName } from '@/lib/utils';
import { track } from '@/lib/track';

export default function ImagesToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePendingDocs((f) => setFiles((prev) => [...prev, ...f]));

  async function convert() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'images-to-pdf');
    try {
      // Name after the first image (e.g. "holiday.pdf"), or a sensible default.
      const name = files.length === 1 ? outputName(files[0]!.name) : 'combined.pdf';
      downloadBlob(await convertImagesToPdf(files), name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ProcessingOverlay show={busy} label="Building your PDF…" />
      <ConvertHeader slug="images-to-pdf" />
      <DropZone
        onFiles={(f) => { setError(null); setFiles((prev) => [...prev, ...f]); }}
        multiple
        accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'] }}
        label="Drop images (JPG/PNG/WebP…)"
        hint="One image per page, in the order added. Processed on your device."
      />
      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
              <span className="truncate">{f.name}</span>
              <span className="text-xs text-[var(--muted-foreground)]">{formatBytes(f.size)}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {files.length > 0 && (
        <div className="flex items-center gap-3">
          <Button onClick={convert} disabled={busy}>
            {busy ? 'Converting…' : `Convert ${files.length} image${files.length === 1 ? '' : 's'} → PDF`}
          </Button>
          <Button variant="ghost" onClick={() => setFiles([])} disabled={busy}>Clear</Button>
        </div>
      )}
    </div>
  );
}
