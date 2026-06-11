'use client';

import { useState } from 'react';
import { convertDocxToPdf } from '@/lib/convert';
import { usePendingDoc } from '@/lib/handoff';
import { ConvertHeader } from '@/components/pdf/ConvertHeader';
import { DropZone } from '@/components/pdf/DropZone';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';

export default function DocxToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePendingDoc((f) => setFile(f));

  async function convert() {
    if (!file) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'docx-to-pdf');
    try {
      downloadBlob(await convertDocxToPdf(file), file.name.replace(/\.docx$/i, '') + '.pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ProcessingOverlay show={busy} label="Converting to PDF…" />
      <ConvertHeader slug="docx-to-pdf" />
      <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
        On-device conversion captures text and basic structure (headings, paragraphs, lists) as
        selectable text. For pixel-perfect Word layouts (complex tables, images), use the
        server-based PDF→Word once your LibreOffice service is running.
      </p>
      {!file ? (
        <DropZone
          onFiles={(f) => { setError(null); setFile(f[0] ?? null); }}
          multiple={false}
          accept={{ 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }}
          label="Drop a .docx file"
          hint="Converted entirely on your device."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <Button onClick={convert} disabled={busy}>{busy ? 'Converting…' : 'Convert to PDF'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
