'use client';

import { useState } from 'react';
import { renderPdfToImageFiles } from '@/lib/pdf/render';
import { makeZip } from '@/lib/zip';
import { ConvertHeader } from '@/components/pdf/ConvertHeader';
import { DropZone } from '@/components/pdf/DropZone';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';

export default function PdfToImagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [dpi, setDpi] = useState(150);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'pdf-to-images');
    try {
      const files = await renderPdfToImageFiles(
        new Uint8Array(await file.arrayBuffer()),
        format,
        dpi,
        (d, t) => setStatus(`Rendering page ${d} of ${t}…`),
      );
      const base = file.name.replace(/\.pdf$/i, '');
      if (files.length === 1) {
        downloadBlob(files[0]!.bytes, `${base}.${format === 'png' ? 'png' : 'jpg'}`, `image/${format === 'png' ? 'png' : 'jpeg'}`);
      } else {
        setStatus('Packaging ZIP…');
        const zip = makeZip(files.map((f) => ({ name: f.name, data: f.bytes })));
        downloadBlob(zip, `${base}_images.zip`, 'application/zip');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed.');
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ProcessingOverlay show={busy} label="Rendering pages to images…" sublabel={status} />
      <ConvertHeader slug="pdf-to-images" />
      {!file ? (
        <DropZone
          onFiles={(f) => { setError(null); setFile(f[0] ?? null); }}
          multiple={false}
          label="Drop a PDF to export as images"
          hint="Each page becomes an image; multiple pages download as a ZIP."
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

          <div className="flex flex-wrap gap-5">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Format</span>
              <select value={format} onChange={(e) => setFormat(e.target.value as 'png' | 'jpg')}
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3">
                <option value="png">PNG (lossless)</option>
                <option value="jpg">JPG (smaller)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Resolution</span>
              <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))}
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3">
                <option value={72}>72 dpi (screen)</option>
                <option value={150}>150 dpi (balanced)</option>
                <option value={300}>300 dpi (print)</option>
              </select>
            </label>
          </div>

          {busy && <p className="text-sm text-[var(--muted-foreground)]">{status ?? 'Working…'}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <Button onClick={run} disabled={busy}>{busy ? 'Converting…' : 'Convert to images'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
