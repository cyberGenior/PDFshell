'use client';

import { useState } from 'react';
import { cropPages, type CropMargins } from '@pdfshell/pdf-core';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { usePendingDoc } from '@/lib/handoff';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';

const SIDES = ['top', 'bottom', 'left', 'right'] as const;
type Side = (typeof SIDES)[number];

const ZERO: CropMargins = { top: 0, bottom: 0, left: 0, right: 0 };

export default function CropPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [margins, setMargins] = useState<CropMargins>(ZERO);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  async function open(f: File) {
    setFile(f);
    setResult(null);
    setError(null);
    setThumb(null);
    setMargins(ZERO);
    try {
      const pdf = await loadPdf(new Uint8Array(await f.arrayBuffer()));
      try {
        setThumb(await renderThumbnail(pdf, 1, 420));
      } finally {
        await pdf.destroy();
      }
    } catch {
      setError('Could not read this PDF.');
      setFile(null);
    }
  }

  usePendingDoc((f) => void open(f));

  function setSide(side: Side, pct: number) {
    setResult(null);
    setMargins((m) => ({ ...m, [side]: pct / 100 }));
  }

  const changed = SIDES.some((s) => margins[s] > 0);

  async function apply() {
    if (!file || !changed) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'crop');
    try {
      const bytes = await cropPages(new Uint8Array(await file.arrayBuffer()), margins);
      const name = file.name.replace(/\.pdf$/i, '') + '_cropped.pdf';
      downloadBlob(bytes, name);
      setResult({ bytes, name });
      track('conversion', 'crop');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cropping failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell slug="crop">
      <ProcessingOverlay show={busy} label="Cropping pages…" />
      {!file ? (
        <DropZone onFiles={(f) => f[0] && open(f[0])} multiple={false} label="Drop a PDF to crop its pages" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(220px,360px)_1fr]">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(file.size)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setFile(null); setResult(null); }}>
                Change
              </Button>
            </div>

            {SIDES.map((side) => (
              <label key={side} className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium capitalize">
                  {side} — {Math.round(margins[side] * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={Math.round(margins[side] * 100)}
                  onChange={(e) => setSide(side, Number(e.target.value))}
                  aria-label={`Trim from ${side}`}
                  className="w-full accent-[var(--brand)]"
                />
              </label>
            ))}

            <p className="text-xs text-[var(--muted-foreground)]">
              The same proportional trim is applied to every page. Cropping is non-destructive —
              the hidden area stays in the file and can be restored later.
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center gap-3">
              <Button onClick={apply} disabled={busy || !changed}>
                {busy ? 'Working…' : 'Crop & download'}
              </Button>
              {changed && (
                <Button variant="ghost" onClick={() => { setMargins(ZERO); setResult(null); }} disabled={busy}>
                  Reset
                </Button>
              )}
            </div>

            {result && <ResultCard bytes={result.bytes} name={result.name} tool="crop" />}
          </div>

          {/* Live preview: the shaded band is what gets trimmed away. */}
          {thumb && (
            <div className="flex flex-col items-center gap-2 lg:items-start">
              <div className="relative w-full max-w-[420px] overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="First page preview" className="w-full" />
                <div aria-hidden className="absolute inset-0">
                  <div className="absolute inset-x-0 top-0 bg-black/45" style={{ height: `${margins.top * 100}%` }} />
                  <div className="absolute inset-x-0 bottom-0 bg-black/45" style={{ height: `${margins.bottom * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-black/45" style={{ width: `${margins.left * 100}%` }} />
                  <div className="absolute inset-y-0 right-0 bg-black/45" style={{ width: `${margins.right * 100}%` }} />
                  <div
                    className="absolute border-2 border-dashed border-[var(--brand)]"
                    style={{
                      top: `${margins.top * 100}%`,
                      bottom: `${margins.bottom * 100}%`,
                      left: `${margins.left * 100}%`,
                      right: `${margins.right * 100}%`,
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Preview — page 1. The dark area is removed.</p>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}
