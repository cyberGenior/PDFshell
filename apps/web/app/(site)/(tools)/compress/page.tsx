'use client';

import { useEffect, useRef, useState } from 'react';
import {
  compressLossless,
  assembleImagePdf,
  classifyOutcome,
  type CompressResult,
} from '@pdfshell/compress-engine';
import { compressViaService, ServiceUnavailableError, type CompressPreset } from '@/lib/libreoffice';
import { renderPdfToImagePages, loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { usePendingDoc } from '@/lib/handoff';
import { usePersistedState } from '@/lib/usePersistedState';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';

type Method = 'strong' | 'flatten' | 'ondevice';

const PRESETS: { value: CompressPreset; label: string; hint: string; dpi: number; quality: number }[] = [
  { value: 'screen', label: 'Smallest', hint: '72 dpi — email & screen', dpi: 72, quality: 0.6 },
  { value: 'ebook', label: 'Balanced', hint: '150 dpi — recommended', dpi: 150, quality: 0.75 },
  { value: 'printer', label: 'High quality', hint: '300 dpi — printing', dpi: 300, quality: 0.85 },
];

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [method, setMethod] = usePersistedState<Method>('compress-method', 'strong');
  const [preset, setPreset] = usePersistedState<CompressPreset>('compress-preset', 'ebook');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const [preview, setPreview] = useState<{ before: string; after: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  // First-page thumbnails of the original vs the compressed result, so the user
  // can see at a glance that nothing was lost (or how flatten changed the page).
  useEffect(() => {
    let cancelled = false;
    if (!file || !result || result.outcome !== 'smaller') {
      setPreview(null);
      return;
    }
    const thumb = async (bytes: Uint8Array) => {
      const pdf = await loadPdf(bytes);
      try {
        return await renderThumbnail(pdf, 1, 220);
      } finally {
        await pdf.destroy();
      }
    };
    (async () => {
      try {
        const before = await thumb(new Uint8Array(await file.arrayBuffer()));
        const after = await thumb(result.bytes);
        if (!cancelled) setPreview({ before, after });
      } catch {
        /* preview is decorative — the result still works without it */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, result]);

  function reset(next: File | null) {
    setFile(next);
    setResult(null);
    setError(null);
    setServiceDown(false);
    setProgress(null);
  }

  usePendingDoc((f) => reset(f));

  function cancel() {
    cancelledRef.current = true;
    abortRef.current?.abort();
    setBusy(false);
    setProgress(null);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setServiceDown(false);
    setResult(null);
    cancelledRef.current = false;
    track('tool_used', 'compress');
    try {
      const originalSize = file.size;
      if (method === 'strong') {
        abortRef.current = new AbortController();
        const bytes = await compressViaService(file, preset, abortRef.current.signal);
        setResult({
          bytes,
          originalSize,
          compressedSize: bytes.byteLength,
          ratio: 1 - bytes.byteLength / originalSize,
          outcome: classifyOutcome(originalSize, bytes.byteLength),
          keptOriginal: bytes.byteLength >= originalSize,
        });
      } else if (method === 'flatten') {
        const p = PRESETS.find((x) => x.value === preset)!;
        const source = new Uint8Array(await file.arrayBuffer());
        const pages = await renderPdfToImagePages(source, p.dpi, p.quality, (done, total) => {
          if (cancelledRef.current) throw new DOMException('Cancelled', 'AbortError');
          setProgress(`Flattening page ${done} of ${total}…`);
        });
        if (cancelledRef.current) return;
        setProgress('Rebuilding the PDF…');
        setResult(await assembleImagePdf(pages, source));
      } else {
        setResult(await compressLossless(new Uint8Array(await file.arrayBuffer())));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // user cancelled
      if (err instanceof ServiceUnavailableError) setServiceDown(true);
      else setError(err instanceof Error ? err.message : 'Compression failed.');
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  }

  const outName = file ? file.name.replace(/\.pdf$/i, '') + '_compressed.pdf' : 'compressed.pdf';

  function download() {
    if (!result) return;
    downloadBlob(result.bytes, outName);
  }

  return (
    <ToolShell slug="compress">
      <ProcessingOverlay
        show={busy}
        label="Compressing your PDF…"
        sublabel={progress ?? (method === 'strong' ? 'Optimising on your server' : 'Optimising on your device')}
        onCancel={cancel}
      />
      {!file ? (
        <DropZone onFiles={(f) => reset(f[0] ?? null)} multiple={false} label="Drop a PDF to compress" />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => reset(null)}>Change</Button>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Method</legend>
            <MethodOption
              checked={method === 'strong'}
              onSelect={() => { setMethod('strong'); setResult(null); }}
              title="Strong compression"
              detail="Best size reduction (Ghostscript). Runs on your self-hosted service."
            />
            <MethodOption
              checked={method === 'flatten'}
              onSelect={() => { setMethod('flatten'); setResult(null); }}
              title="Strong, on-device (flatten)"
              detail="Big savings on scanned/image PDFs — nothing uploaded, works offline. Pages become images, so selectable text is lost."
            />
            <MethodOption
              checked={method === 'ondevice'}
              onSelect={() => { setMethod('ondevice'); setResult(null); }}
              title="Lossless, on-device (private)"
              detail="Re-optimises in your browser — nothing uploaded. Gains are modest; never enlarges; text stays selectable."
            />
          </fieldset>

          {method !== 'ondevice' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Quality</span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { setPreset(p.value); setResult(null); }}
                    aria-pressed={preset === p.value}
                    className={
                      'rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] ' +
                      (preset === p.value
                        ? 'border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)]'
                        : 'border-[var(--border)] hover:bg-[var(--surface-2)]')
                    }
                  >
                    <span className="block font-medium">{p.label}</span>
                    <span className="block text-xs text-[var(--muted-foreground)]">{p.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {method === 'flatten' && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              Flatten rebuilds every page as an image: great for scans, but selectable text and links
              are lost, and text-heavy PDFs can come out <em>larger</em> — if so, PDFShell keeps your original.
            </div>
          )}

          {serviceDown && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
              <p className="font-medium">Compression service isn’t running.</p>
              <p className="mt-1 text-red-500/90">
                Start it with <code className="rounded bg-black/10 px-1 dark:bg-white/10">docker compose up convert</code>,
                or use an on-device method — “flatten” gives similar savings on scans.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {preview && result && (
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: 'Before', url: preview.before, size: result.originalSize, dim: false },
                { label: 'After', url: preview.after, size: result.compressedSize, dim: true },
              ] as const).map((side) => (
                <figure key={side.label} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={side.url}
                    alt={`${side.label}: first page`}
                    className="max-h-64 w-auto rounded-md border border-[var(--border)] bg-white shadow-sm"
                  />
                  <figcaption className="text-center text-xs">
                    <span className="font-medium">{side.label}</span>
                    <span className={'ml-1.5 ' + (side.dim ? 'text-[oklch(0.55_0.15_150)] font-semibold' : 'text-[var(--muted-foreground)]')}>
                      {formatBytes(side.size)}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
              {result.outcome === 'smaller' ? (
                <p>
                  <span className="font-semibold text-[oklch(0.55_0.15_150)]">
                    {(result.ratio * 100).toFixed(0)}% smaller
                  </span>{' '}
                  — {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
                </p>
              ) : (
                <p className="text-[var(--muted-foreground)]">
                  Already well optimised — no meaningful reduction ({formatBytes(result.originalSize)}).
                  {method === 'ondevice' && ' Try “flatten” for image-heavy PDFs.'}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {result && result.outcome === 'smaller' ? (
              <>
                <Button onClick={download}>Download compressed PDF</Button>
                <Button variant="ghost" onClick={() => setResult(null)}>Try another setting</Button>
              </>
            ) : (
              <Button onClick={run} disabled={busy}>
                {busy ? 'Compressing…' : 'Compress'}
              </Button>
            )}
          </div>

          {result && result.outcome === 'smaller' && (
            <ResultCard bytes={result.bytes} name={outName} tool="compress" originalSize={result.originalSize} />
          )}
        </div>
      )}
    </ToolShell>
  );
}

function MethodOption({
  checked,
  onSelect,
  title,
  detail,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      role="radio"
      aria-checked={checked}
      className={
        'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] ' +
        (checked ? 'border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)]' : 'border-[var(--border)]')
      }
    >
      <span className={'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ' + (checked ? 'border-[var(--brand)]' : 'border-[var(--muted-foreground)]')}>
        {checked && <span className="size-2 rounded-full bg-[var(--brand)]" />}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-[var(--muted-foreground)]">{detail}</span>
      </span>
    </button>
  );
}
