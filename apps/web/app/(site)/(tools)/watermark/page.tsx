'use client';

import { useState } from 'react';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { usePendingDoc } from '@/lib/handoff';
import { usePersistedState } from '@/lib/usePersistedState';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  if (h.length !== 6) return { r: 0.45, g: 0.45, b: 0.45 };
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [text, setText] = usePersistedState('watermark-text', 'CONFIDENTIAL');
  const [opacity, setOpacity] = usePersistedState('watermark-opacity', 18);
  const [angle, setAngle] = usePersistedState('watermark-angle', 45);
  const [color, setColor] = usePersistedState('watermark-color', '#737373');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  async function open(f: File) {
    setFile(f);
    setResult(null);
    setError(null);
    setThumb(null);
    try {
      const pdf = await loadPdf(new Uint8Array(await f.arrayBuffer()));
      try {
        setThumb(await renderThumbnail(pdf, 1, 320));
      } finally {
        await pdf.destroy();
      }
    } catch {
      setError('Could not read this PDF.');
      setFile(null);
    }
  }

  usePendingDoc((f) => void open(f));

  async function apply() {
    if (!file || !text.trim()) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'watermark');
    try {
      const { addWatermark } = await import('@pdfshell/pdf-core');
      const bytes = await addWatermark(new Uint8Array(await file.arrayBuffer()), text.trim(), {
        opacity: opacity / 100,
        angle,
        color: hexToRgb(color),
      });
      const name = file.name.replace(/\.pdf$/i, '') + '_watermarked.pdf';
      downloadBlob(bytes, name);
      setResult({ bytes, name });
      track('conversion', 'watermark');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Watermarking failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell slug="watermark">
      <ProcessingOverlay show={busy} label="Stamping the watermark…" />
      {!file ? (
        <DropZone onFiles={(f) => f[0] && open(f[0])} multiple={false} label="Drop a PDF to watermark" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(240px,340px)]">
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

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Watermark text</span>
              <input
                type="text"
                value={text}
                maxLength={60}
                onChange={(e) => { setText(e.target.value); setResult(null); }}
                placeholder="e.g. DRAFT"
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Opacity — {opacity}%</span>
              <input
                type="range"
                min={5}
                max={60}
                value={opacity}
                onChange={(e) => { setOpacity(Number(e.target.value)); setResult(null); }}
                className="w-full max-w-xs accent-[var(--brand)]"
              />
            </label>

            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Direction</span>
                <select
                  value={angle}
                  onChange={(e) => { setAngle(Number(e.target.value)); setResult(null); }}
                  className="h-10 w-fit rounded-md border border-[var(--border)] bg-[var(--background)] px-3"
                >
                  <option value={45}>Diagonal ↗</option>
                  <option value={-45}>Diagonal ↘</option>
                  <option value={0}>Horizontal →</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Colour</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => { setColor(e.target.value); setResult(null); }}
                  className="h-10 w-16 cursor-pointer rounded-md border border-[var(--border)] bg-[var(--background)] p-1"
                />
              </label>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center gap-3">
              <Button onClick={apply} disabled={busy || !text.trim()}>
                {busy ? 'Working…' : 'Add watermark & download'}
              </Button>
            </div>

            {result && <ResultCard bytes={result.bytes} name={result.name} tool="watermark" />}
          </div>

          {/* Live CSS approximation of the stamped result. */}
          {thumb && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-full max-w-[320px] overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="First page preview" className="w-full" />
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 whitespace-nowrap font-bold"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
                    color,
                    opacity: opacity / 100,
                    fontSize: `${Math.max(12, 220 / Math.max(4, text.length))}px`,
                  }}
                >
                  {text || '…'}
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Preview — page 1</p>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}
