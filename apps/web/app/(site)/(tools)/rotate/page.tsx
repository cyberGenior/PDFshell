'use client';

import { useState } from 'react';
import { rotatePages } from '@pdfshell/pdf-core';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { usePendingDoc } from '@/lib/handoff';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob } from '@/lib/utils';
import { track } from '@/lib/track';
import { Loader2, RotateCcw, RotateCw } from 'lucide-react';

interface PageThumb {
  page: number;
  thumb: string;
}

export default function RotatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  /** 1-based page → accumulated clockwise delta (0/90/180/270). */
  const [deltas, setDeltas] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  async function open(f: File) {
    setFile(f);
    setThumbs([]);
    setDeltas({});
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const pdf = await loadPdf(new Uint8Array(await f.arrayBuffer()));
      try {
        const out: PageThumb[] = [];
        for (let p = 1; p <= pdf.numPages; p++) {
          out.push({ page: p, thumb: await renderThumbnail(pdf, p, 140) });
          setThumbs([...out]);
        }
      } finally {
        await pdf.destroy();
      }
    } catch {
      setError('Could not read this PDF.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  usePendingDoc((f) => void open(f));

  function turn(page: number, by: number) {
    setResult(null);
    setDeltas((prev) => ({ ...prev, [page]: (((prev[page] ?? 0) + by) % 360 + 360) % 360 }));
  }

  function turnAll(by: number) {
    setResult(null);
    setDeltas((prev) => {
      const next: Record<number, number> = {};
      for (const t of thumbs) next[t.page] = (((prev[t.page] ?? 0) + by) % 360 + 360) % 360;
      return next;
    });
  }

  const changed = Object.values(deltas).some((d) => d !== 0);

  async function apply() {
    if (!file || !changed) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'rotate');
    try {
      const effective = Object.fromEntries(Object.entries(deltas).filter(([, d]) => d !== 0));
      const bytes = await rotatePages(new Uint8Array(await file.arrayBuffer()), effective);
      const name = file.name.replace(/\.pdf$/i, '') + '_rotated.pdf';
      downloadBlob(bytes, name);
      setResult({ bytes, name });
      track('conversion', 'rotate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rotation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell slug="rotate">
      <ProcessingOverlay show={busy} label="Rotating pages…" />
      {!file ? (
        <DropZone onFiles={(f) => f[0] && open(f[0])} multiple={false} label="Drop a PDF to rotate its pages" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => turnAll(90)}>
              <RotateCw /> Rotate all 90°
            </Button>
            <Button variant="outline" size="sm" onClick={() => turnAll(-90)}>
              <RotateCcw /> Rotate all -90°
            </Button>
            <Button variant="outline" size="sm" onClick={() => turnAll(180)}>
              Rotate all 180°
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setThumbs([]); setDeltas({}); setResult(null); }}>
              Change file
            </Button>
          </div>

          {loading && (
            <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="size-4 animate-spin" /> Loading pages…
            </p>
          )}

          <p className="text-sm text-[var(--muted-foreground)]">
            Click a page (or press Enter on it) to turn it 90° clockwise.
          </p>

          <div className="flex flex-wrap gap-3">
            {thumbs.map((t) => {
              const d = deltas[t.page] ?? 0;
              return (
                <button
                  key={t.page}
                  type="button"
                  onClick={() => turn(t.page, 90)}
                  aria-label={`Page ${t.page}, rotated ${d}°. Activate to rotate another 90 degrees.`}
                  className="group relative w-[120px] rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 transition-colors hover:border-[var(--brand)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span className="absolute left-2.5 top-2.5 z-10 grid size-6 place-items-center rounded-full gradient-brand text-xs font-semibold text-white shadow">
                    {t.page}
                  </span>
                  {d !== 0 && (
                    <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {d}°
                    </span>
                  )}
                  <span className="grid aspect-[3/4] place-items-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.thumb}
                      alt={`Page ${t.page} preview`}
                      style={{ transform: `rotate(${d}deg)`, maxWidth: d % 180 === 0 ? '100%' : '75%' }}
                      className="rounded-md border border-[var(--border)] bg-white transition-transform"
                    />
                  </span>
                </button>
              );
            })}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={apply} disabled={busy || !changed}>
              {busy ? 'Working…' : 'Apply rotation & download'}
            </Button>
            {changed && (
              <Button variant="ghost" onClick={() => setDeltas({})} disabled={busy}>
                Reset
              </Button>
            )}
          </div>

          {result && <ResultCard bytes={result.bytes} name={result.name} tool="rotate" />}
        </div>
      )}
    </ToolShell>
  );
}
