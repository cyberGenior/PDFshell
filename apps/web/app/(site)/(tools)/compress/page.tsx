'use client';

import { useState } from 'react';
import { compressLossless, classifyOutcome, type CompressResult } from '@pdfshell/compress-engine';
import { compressViaService, ServiceUnavailableError, type CompressPreset } from '@/lib/libreoffice';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';

type Method = 'strong' | 'ondevice';

const PRESETS: { value: CompressPreset; label: string; hint: string }[] = [
  { value: 'screen', label: 'Smallest', hint: '72 dpi — email & screen' },
  { value: 'ebook', label: 'Balanced', hint: '150 dpi — recommended' },
  { value: 'printer', label: 'High quality', hint: '300 dpi — printing' },
];

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [method, setMethod] = useState<Method>('strong');
  const [preset, setPreset] = useState<CompressPreset>('ebook');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);

  function reset(next: File | null) {
    setFile(next);
    setResult(null);
    setError(null);
    setServiceDown(false);
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setServiceDown(false);
    setResult(null);
    track('tool_used', 'compress');
    try {
      const originalSize = file.size;
      if (method === 'strong') {
        const bytes = await compressViaService(file, preset);
        setResult({
          bytes,
          originalSize,
          compressedSize: bytes.byteLength,
          ratio: 1 - bytes.byteLength / originalSize,
          outcome: classifyOutcome(originalSize, bytes.byteLength),
          keptOriginal: bytes.byteLength >= originalSize,
        });
      } else {
        setResult(await compressLossless(new Uint8Array(await file.arrayBuffer())));
      }
    } catch (err) {
      if (err instanceof ServiceUnavailableError) setServiceDown(true);
      else setError(err instanceof Error ? err.message : 'Compression failed.');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!result || !file) return;
    downloadBlob(result.bytes, file.name.replace(/\.pdf$/i, '') + '_compressed.pdf');
  }

  return (
    <ToolShell slug="compress">
      <ProcessingOverlay show={busy} label="Compressing your PDF…" sublabel={method === 'strong' ? 'Optimising on your server' : 'Optimising on your device'} />
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
              checked={method === 'ondevice'}
              onSelect={() => { setMethod('ondevice'); setResult(null); }}
              title="On-device (private)"
              detail="Re-optimises in your browser — nothing uploaded. Gains are modest; never enlarges."
            />
          </fieldset>

          {method === 'strong' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Quality</span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { setPreset(p.value); setResult(null); }}
                    className={
                      'rounded-xl border px-3 py-2 text-left text-sm transition-colors ' +
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

          {serviceDown && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">
              <p className="font-medium">Compression service isn’t running.</p>
              <p className="mt-1 text-red-500/90">
                Start it with <code className="rounded bg-black/10 px-1 dark:bg-white/10">docker compose up convert</code>,
                or use the on-device method.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

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
                  {method === 'ondevice' && ' Try “Strong compression” for image-heavy PDFs.'}
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
      className={
        'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ' +
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
