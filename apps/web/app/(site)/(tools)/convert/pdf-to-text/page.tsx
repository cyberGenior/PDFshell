'use client';

import { useState } from 'react';
import { extractPdfText } from '@/lib/pdf/extractText';
import { ConvertHeader } from '@/components/pdf/ConvertHeader';
import { DropZone } from '@/components/pdf/DropZone';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';

export default function PdfToTextPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(f: File) {
    setFile(f);
    setText(null);
    setError(null);
    setBusy(true);
    track('tool_used', 'pdf-to-text');
    try {
      const out = await extractPdfText(new Uint8Array(await f.arrayBuffer()), (d, t) =>
        setStatus(`Reading page ${d} of ${t}…`),
      );
      setText(out || '(No selectable text found — this looks like a scanned PDF. Try OCR.)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed.');
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ProcessingOverlay show={busy} label="Extracting text…" sublabel={status} />
      <ConvertHeader slug="pdf-to-text" />
      {!file ? (
        <DropZone
          onFiles={(f) => f[0] && run(f[0])}
          multiple={false}
          label="Drop a PDF to extract text"
          hint="Works on PDFs with a text layer. Scanned PDFs → use OCR."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setText(null); }}>Change</Button>
          </div>
          {busy && <p className="text-sm text-[var(--muted-foreground)]">{status ?? 'Working…'}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {text !== null && (
            <>
              <textarea
                readOnly
                value={text}
                className="h-80 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-sm"
              />
              <div className="flex items-center gap-3">
                <Button onClick={() => downloadBlob(new TextEncoder().encode(text), file.name.replace(/\.pdf$/i, '') + '.txt', 'text/plain')}>
                  Download .txt
                </Button>
                <Button variant="outline" onClick={() => navigator.clipboard?.writeText(text)}>Copy</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
