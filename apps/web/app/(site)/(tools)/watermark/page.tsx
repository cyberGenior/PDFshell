'use client';

import { useState } from 'react';
import { Type, ImageIcon } from 'lucide-react';
import type { WatermarkPosition, StampFontFamily } from '@pdfshell/pdf-core';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { usePendingDoc } from '@/lib/handoff';
import { usePersistedState } from '@/lib/usePersistedState';
import { fileToPng } from '@/lib/image';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { OptionCard } from '@/components/ui/OptionCard';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes, hexToRgb, cn } from '@/lib/utils';
import { toast } from '@/lib/useToast';
import { track } from '@/lib/track';

type Mode = 'text' | 'image';

// 3×3 anchor grid (matches WatermarkPosition), with a directional glyph.
const POSITION_GRID: { value: WatermarkPosition; glyph: string }[] = [
  { value: 'top-left', glyph: '↖' }, { value: 'top-center', glyph: '↑' }, { value: 'top-right', glyph: '↗' },
  { value: 'middle-left', glyph: '←' }, { value: 'center', glyph: '●' }, { value: 'middle-right', glyph: '→' },
  { value: 'bottom-left', glyph: '↙' }, { value: 'bottom-center', glyph: '↓' }, { value: 'bottom-right', glyph: '↘' },
];

const FONTS: { value: StampFontFamily; label: string }[] = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
];

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('text');

  // Text options
  const [text, setText] = usePersistedState('watermark-text', 'CONFIDENTIAL');
  const [font, setFont] = usePersistedState<StampFontFamily>('watermark-font', 'sans');
  const [angle, setAngle] = usePersistedState('watermark-angle', 45);
  const [color, setColor] = usePersistedState('watermark-color', '#737373');

  // Image options
  const [image, setImage] = useState<{ bytes: Uint8Array; aspect: number; url: string } | null>(null);
  const [scale, setScale] = usePersistedState('watermark-scale', 30);

  // Shared options
  const [position, setPosition] = usePersistedState<WatermarkPosition>('watermark-position', 'center');
  const [tile, setTile] = usePersistedState('watermark-tile', false);
  const [opacity, setOpacity] = usePersistedState('watermark-opacity', 18);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  function dirty() {
    setResult(null);
  }

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

  async function pickImage(f: File) {
    try {
      const { bytes, aspect } = await fileToPng(f);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }));
      setImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { bytes, aspect, url };
      });
      dirty();
    } catch {
      setError('Could not read that image.');
    }
  }

  const ready = !!file && (mode === 'text' ? text.trim().length > 0 : !!image);

  async function apply() {
    if (!file || !ready) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'watermark', { mode });
    try {
      const src = new Uint8Array(await file.arrayBuffer());
      const core = await import('@pdfshell/pdf-core');
      let bytes: Uint8Array;
      if (mode === 'text') {
        bytes = await core.addWatermark(src, text.trim(), {
          opacity: opacity / 100,
          angle,
          color: hexToRgb(color),
          font,
          position,
          tile,
        });
      } else {
        bytes = await core.addImageWatermark(src, image!.bytes, {
          opacity: opacity / 100,
          scale: scale / 100,
          position,
          tile,
        });
      }
      const name = file.name.replace(/\.pdf$/i, '') + '_watermarked.pdf';
      downloadBlob(bytes, name);
      setResult({ bytes, name });
      toast.success('Saved to your device.');
      track('conversion', 'watermark');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Watermarking failed.');
      toast.error('Watermarking failed.');
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

            {/* Text vs image */}
            <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-sm" role="tablist">
              {([
                { value: 'text', label: 'Text', icon: Type },
                { value: 'image', label: 'Image / logo', icon: ImageIcon },
              ] as const).map((m) => (
                <button
                  key={m.value}
                  role="tab"
                  aria-selected={mode === m.value}
                  onClick={() => { setMode(m.value); dirty(); }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5',
                    mode === m.value ? 'bg-[var(--surface-2)] font-medium' : 'text-[var(--muted-foreground)]',
                  )}
                >
                  <m.icon className="size-4" /> {m.label}
                </button>
              ))}
            </div>

            {mode === 'text' ? (
              <>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Watermark text</span>
                  <input
                    type="text"
                    value={text}
                    maxLength={60}
                    onChange={(e) => { setText(e.target.value); dirty(); }}
                    placeholder="e.g. DRAFT"
                    className="h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3"
                  />
                </label>

                <div className="flex flex-wrap items-end gap-4">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Font</span>
                    <select
                      value={font}
                      onChange={(e) => { setFont(e.target.value as StampFontFamily); dirty(); }}
                      className="h-10 w-fit rounded-md border border-[var(--border)] bg-[var(--background)] px-3"
                    >
                      {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Direction</span>
                    <select
                      value={angle}
                      onChange={(e) => { setAngle(Number(e.target.value)); dirty(); }}
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
                      onChange={(e) => { setColor(e.target.value); dirty(); }}
                      className="h-10 w-16 cursor-pointer rounded-md border border-[var(--border)] bg-[var(--background)] p-1"
                    />
                  </label>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                {!image ? (
                  <DropZone
                    onFiles={(f) => f[0] && pickImage(f[0])}
                    multiple={false}
                    accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
                    label="Drop a logo or stamp image"
                    hint="PNG with transparency works best."
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="Watermark" className="h-12 w-12 rounded object-contain" />
                    <span className="flex-1 text-sm text-[var(--muted-foreground)]">Image ready</span>
                    <Button variant="ghost" size="sm" onClick={() => { URL.revokeObjectURL(image.url); setImage(null); dirty(); }}>
                      Change
                    </Button>
                  </div>
                )}
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Size — {scale}% of page width</span>
                  <input
                    type="range" min={5} max={90} value={scale}
                    onChange={(e) => { setScale(Number(e.target.value)); dirty(); }}
                    className="w-full max-w-xs accent-[var(--brand)]"
                  />
                </label>
              </div>
            )}

            {/* Position grid (disabled when tiling) */}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Position</legend>
              <div className={cn('grid w-fit grid-cols-3 gap-1.5', tile && 'pointer-events-none opacity-40')}>
                {POSITION_GRID.map((p) => (
                  <OptionCard
                    key={p.value}
                    compact
                    selected={position === p.value}
                    onSelect={() => { setPosition(p.value); dirty(); }}
                    className="size-10 text-center"
                  >
                    <span className="grid h-full place-items-center text-base leading-none">{p.glyph}</span>
                  </OptionCard>
                ))}
              </div>
            </fieldset>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={tile} onChange={(e) => { setTile(e.target.checked); dirty(); }} className="size-4 accent-[var(--brand)]" />
              <span className="font-medium">Tile across the whole page</span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Opacity — {opacity}%</span>
              <input
                type="range" min={5} max={80} value={opacity}
                onChange={(e) => { setOpacity(Number(e.target.value)); dirty(); }}
                className="w-full max-w-xs accent-[var(--brand)]"
              />
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center gap-3">
              <Button onClick={apply} disabled={busy || !ready}>
                {busy ? 'Working…' : 'Add watermark & download'}
              </Button>
            </div>

            {result && <ResultCard bytes={result.bytes} name={result.name} tool="watermark" />}
          </div>

          {/* Live preview of page 1. */}
          {thumb && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-full max-w-[320px] overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="First page preview" className="w-full" />
                <PreviewMark
                  mode={mode}
                  text={text}
                  imageUrl={image?.url}
                  color={color}
                  angle={angle}
                  opacity={opacity}
                  position={position}
                  tile={tile}
                  scale={scale}
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Preview — page 1{tile ? ' (tiled)' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}

/** CSS approximation of the stamped result for the preview pane. */
function PreviewMark({
  mode, text, imageUrl, color, angle, opacity, position, tile, scale,
}: {
  mode: Mode; text: string; imageUrl?: string; color: string; angle: number;
  opacity: number; position: WatermarkPosition; tile: boolean; scale: number;
}) {
  if (tile) {
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-4 place-items-center"
        style={{ opacity: opacity / 100 }}
      >
        {Array.from({ length: 12 }).map((_, i) =>
          mode === 'text' ? (
            <span key={i} className="whitespace-nowrap text-[10px] font-bold" style={{ color, transform: `rotate(${-angle}deg)` }}>
              {text || '…'}
            </span>
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={imageUrl} alt="" className="w-8 object-contain" />
          ) : <span key={i} />,
        )}
      </span>
    );
  }

  const pos: React.CSSProperties = { position: 'absolute' };
  if (position.startsWith('top')) pos.top = '6%';
  else if (position.startsWith('bottom')) pos.bottom = '6%';
  else { pos.top = '50%'; pos.transform = 'translateY(-50%)'; }
  if (position.endsWith('left')) pos.left = '6%';
  else if (position.endsWith('right')) pos.right = '6%';
  else { pos.left = '50%'; pos.transform = (pos.transform ? pos.transform + ' ' : '') + 'translateX(-50%)'; }

  if (mode === 'image') {
    if (!imageUrl) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img aria-hidden src={imageUrl} alt="" style={{ ...pos, width: `${scale}%`, opacity: opacity / 100 }} />
    );
  }
  return (
    <span
      aria-hidden
      className="whitespace-nowrap font-bold"
      style={{
        ...pos,
        color,
        opacity: opacity / 100,
        transform: (pos.transform ? pos.transform + ' ' : '') + (position === 'center' ? `rotate(${-angle}deg)` : ''),
        fontSize: position === 'center' ? `${Math.max(12, 220 / Math.max(4, text.length))}px` : '14px',
      }}
    >
      {text || '…'}
    </span>
  );
}
