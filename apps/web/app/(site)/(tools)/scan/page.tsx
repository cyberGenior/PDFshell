'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ImageInput } from '@pdfshell/pdf-core';
import { usePendingDocs } from '@/lib/handoff';
import { usePersistedState } from '@/lib/usePersistedState';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob } from '@/lib/utils';
import { track } from '@/lib/track';
import { Camera, RotateCw, X, Sparkles, Loader2 } from 'lucide-react';

interface Shot {
  id: string;
  file: File;
  rotation: 0 | 90 | 180 | 270;
}

let seq = 0;
const uid = () => `s${seq++}`;

/** Push paper-white and darken ink: a simple level stretch on the grey channel. */
function enhanceDocument(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const black = 60;
  const white = 205;
  const range = white - black;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    let v = ((g - black) / range) * 255;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

/** Decode a shot, apply rotation + optional document filter, return a canvas. */
async function renderShot(shot: Shot, enhance: boolean, maxDim: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(shot.file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const swap = shot.rotation === 90 || shot.rotation === 270;

  const canvas = document.createElement('canvas');
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((shot.rotation * Math.PI) / 180);
  ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
  ctx.restore();
  bitmap.close();

  if (enhance) enhanceDocument(ctx, canvas.width, canvas.height);
  return canvas;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error('encode failed'))),
      'image/jpeg',
      quality,
    ),
  );
}

export default function ScanPage() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [enhance, setEnhance] = usePersistedState('scan-enhance', true);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function addFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) {
      setError('Please add photos or image files (JPG, PNG).');
      return;
    }
    setError(null);
    setResult(null);
    setShots((prev) => [...prev, ...images.map((file) => ({ id: uid(), file, rotation: 0 as const }))]);
  }

  // Landing-page / chaining handoff (e.g. images dropped on the home hero).
  usePendingDocs(addFiles);

  // Build a small live preview for every shot whenever rotation or enhance changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const shot of shots) {
        try {
          const canvas = await renderShot(shot, enhance, 420);
          out[shot.id] = canvas.toDataURL('image/jpeg', 0.7);
        } catch {
          /* skip a shot that fails to decode */
        }
      }
      if (!cancelled) setPreviews(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [shots, enhance]);

  function rotate(id: string) {
    setShots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, rotation: (((s.rotation + 90) % 360) as Shot['rotation']) } : s)),
    );
  }

  function remove(id: string) {
    setShots((prev) => prev.filter((s) => s.id !== id));
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    setShots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to > from ? to - 1 : to, 0, moved!);
      return next;
    });
  }

  function moveBy(index: number, delta: -1 | 1) {
    const to = index + delta;
    if (to < 0 || to >= shots.length) return;
    setShots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  }

  async function build() {
    if (shots.length === 0) return;
    setBuilding(true);
    setError(null);
    track('tool_used', 'scan');
    try {
      const images: ImageInput[] = [];
      for (const shot of shots) {
        const canvas = await renderShot(shot, enhance, 2200);
        images.push({ bytes: await canvasToJpeg(canvas, 0.82), format: 'jpg' });
      }
      const { imagesToPdf } = await import('@pdfshell/pdf-core');
      const bytes = await imagesToPdf(images);
      const name = `scan_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadBlob(bytes, name);
      setResult({ bytes, name });
      track('conversion', 'scan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the PDF.');
    } finally {
      setBuilding(false);
    }
  }

  return (
    <ToolShell slug="scan">
      <ProcessingOverlay show={building} label="Building your PDF…" sublabel="Cleaning up and assembling pages on your device" />

      <div className="flex flex-col gap-3">
        <DropZone
          onFiles={addFiles}
          accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic'] }}
          label="Take photos of your pages, or drop images here"
          hint="Each photo becomes one page. Nothing leaves your device."
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button variant="outline" onClick={() => cameraRef.current?.click()}>
              <Camera /> Take a photo
            </Button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enhance}
            onClick={() => setEnhance(!enhance)}
            className={
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] ' +
              (enhance
                ? 'border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)]'
                : 'border-[var(--border)]')
            }
          >
            <Sparkles className="size-4" />
            Clean up scan {enhance ? 'on' : 'off'}
          </button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          “Clean up” boosts contrast and whitens the paper so photos of documents read like real scans. Turn it off for
          photos or colour pages.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {shots.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {shots.length} page{shots.length === 1 ? '' : 's'}. <strong className="text-[var(--foreground)]">Drag</strong> to
            reorder, rotate or remove — the order here is the final document.
          </p>

          <div className="flex flex-wrap gap-3" role="list" aria-label="Scanned pages in order">
            {shots.map((shot, i) => (
              <motion.div
                key={shot.id}
                layout
                transition={{ type: 'spring', stiffness: 600, damping: 45 }}
                draggable
                tabIndex={0}
                role="listitem"
                aria-label={`Page ${i + 1} of ${shots.length}. Use arrow keys to move, Delete to remove.`}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); moveBy(i, -1); }
                  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); moveBy(i, 1); }
                  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(shot.id); }
                }}
                onDragStart={() => setDragIndex(i)}
                onDragEnter={() => setOverIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIndex !== null) reorder(dragIndex, i); setDragIndex(null); setOverIndex(null); }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                className={
                  'group relative w-[136px] cursor-grab rounded-xl border bg-[var(--card)] p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] active:cursor-grabbing ' +
                  (dragIndex === i ? 'opacity-40 ' : '') +
                  (overIndex === i && dragIndex !== i ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]' : 'border-[var(--border)]')
                }
              >
                <span className="absolute left-3 top-3 z-10 grid size-6 place-items-center rounded-full gradient-brand text-xs font-semibold text-white shadow">
                  {i + 1}
                </span>
                <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    onClick={() => rotate(shot.id)}
                    className="grid size-6 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label={`Rotate page ${i + 1}`}
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                  <button
                    onClick={() => remove(shot.id)}
                    className="grid size-6 place-items-center rounded-full bg-black/50 text-white hover:bg-red-500"
                    aria-label={`Remove page ${i + 1}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                {previews[shot.id] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previews[shot.id]}
                    alt={`Scanned page ${i + 1}`}
                    loading="lazy"
                    className="pointer-events-none aspect-[3/4] w-full rounded-md border border-[var(--border)] bg-white object-cover"
                  />
                ) : (
                  <div className="grid aspect-[3/4] w-full place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)]">
                    <Loader2 className="size-4 animate-spin text-[var(--muted-foreground)]" />
                  </div>
                )}
                <p className="mt-1.5 text-center text-[11px] text-[var(--muted-foreground)]">Page {i + 1}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={build} disabled={building}>
              {building ? 'Working…' : `Create PDF (${shots.length} page${shots.length === 1 ? '' : 's'})`}
            </Button>
            <Button variant="ghost" onClick={() => { setShots([]); setResult(null); }} disabled={building}>
              Clear
            </Button>
          </div>

          {result && <ResultCard bytes={result.bytes} name={result.name} tool="scan" />}
        </div>
      )}
    </ToolShell>
  );
}
