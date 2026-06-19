'use client';

import { useState } from 'react';
import { addPageNumbers, getPageCount, type PageNumberPosition, type StampFontFamily } from '@pdfshell/pdf-core';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { usePendingDoc } from '@/lib/handoff';
import { usePersistedState } from '@/lib/usePersistedState';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { PrivacyNote } from '@/components/pdf/PrivacyNote';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { OptionCard } from '@/components/ui/OptionCard';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes, hexToRgb, cn } from '@/lib/utils';
import { toast } from '@/lib/useToast';
import { track } from '@/lib/track';

type Format = 'n' | 'n-of-total' | 'page-n-of-total';

const FONTS: { value: StampFontFamily; label: string }[] = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
];

const POSITIONS: { value: PageNumberPosition; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top centre' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom centre' },
  { value: 'bottom-right', label: 'Bottom right' },
];

export default function PageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [total, setTotal] = useState(0);
  const [thumb, setThumb] = useState<string | null>(null);
  const [position, setPosition] = usePersistedState<PageNumberPosition>('pagenum-position', 'bottom-center');
  const [format, setFormat] = usePersistedState<Format>('pagenum-format', 'n');
  const [pnFont, setPnFont] = usePersistedState<StampFontFamily>('pagenum-font', 'sans');
  const [fontSize, setFontSize] = usePersistedState('pagenum-size', 11);
  const [bold, setBold] = usePersistedState('pagenum-bold', false);
  const [color, setColor] = usePersistedState('pagenum-color', '#404040');
  const [prefix, setPrefix] = usePersistedState('pagenum-prefix', '');
  const [suffix, setSuffix] = usePersistedState('pagenum-suffix', '');
  const [startAt, setStartAt] = useState(1);
  const [fromPage, setFromPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  async function open(f: File) {
    setFile(f);
    setResult(null);
    setError(null);
    setThumb(null);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      setTotal(await getPageCount(bytes));
      const pdf = await loadPdf(bytes);
      try {
        setThumb(await renderThumbnail(pdf, 1, 280));
      } finally {
        await pdf.destroy();
      }
      setFromPage(1);
    } catch {
      setError('Could not read this PDF.');
      setFile(null);
    }
  }

  usePendingDoc((f) => void open(f));

  async function apply() {
    if (!file) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'page-numbers');
    try {
      const bytes = await addPageNumbers(new Uint8Array(await file.arrayBuffer()), {
        position,
        format,
        startAt,
        fromPage,
        font: pnFont,
        fontSize,
        bold,
        color: hexToRgb(color),
        prefix,
        suffix,
      });
      const name = file.name.replace(/\.pdf$/i, '') + '_numbered.pdf';
      downloadBlob(bytes, name);
      setResult({ bytes, name });
      toast.success('Saved to your device.');
      track('conversion', 'page-numbers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Numbering failed.');
      toast.error('Numbering failed.');
    } finally {
      setBusy(false);
    }
  }

  const sampleLast = startAt + Math.max(0, total - fromPage);
  const core =
    format === 'page-n-of-total'
      ? `Page ${startAt} of ${sampleLast}`
      : format === 'n-of-total'
        ? `${startAt} / ${sampleLast}`
        : `${startAt}`;
  const sample = `${prefix}${core}${suffix}`;

  return (
    <ToolShell slug="page-numbers">
      <ProcessingOverlay show={busy} label="Stamping page numbers…" />
      {!file ? (
        <DropZone onFiles={(f) => f[0] && open(f[0])} multiple={false} label="Drop a PDF to add page numbers" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(220px,300px)]">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatBytes(file.size)} · {total} page{total === 1 ? '' : 's'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setFile(null); setResult(null); }}>
                Change
              </Button>
            </div>
            <PrivacyNote mode="device" />

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Position</legend>
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map((p) => (
                  <OptionCard
                    key={p.value}
                    compact
                    selected={position === p.value}
                    onSelect={() => { setPosition(p.value); setResult(null); }}
                    label={p.label}
                  />
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Format</span>
                <Select
                  value={format}
                  onChange={(e) => { setFormat(e.target.value as Format); setResult(null); }}
                >
                  <option value="n">4</option>
                  <option value="n-of-total">4 / 12</option>
                  <option value="page-n-of-total">Page 4 of 12</option>
                </Select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Font</span>
                <Select
                  value={pnFont}
                  onChange={(e) => { setPnFont(e.target.value as StampFontFamily); setResult(null); }}
                >
                  {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select>
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
              <label className="flex items-center gap-2 self-center pt-5 text-sm">
                <input type="checkbox" checked={bold} onChange={(e) => { setBold(e.target.checked); setResult(null); }} className="size-4 accent-[var(--brand)]" />
                <span className="font-medium">Bold</span>
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Size — {fontSize} pt</span>
              <input
                type="range" min={7} max={36} value={fontSize}
                onChange={(e) => { setFontSize(Number(e.target.value)); setResult(null); }}
                className="w-full max-w-xs accent-[var(--brand)]"
              />
            </label>

            <div className="flex flex-wrap gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Prefix</span>
                <Input
                  type="text" value={prefix} maxLength={12}
                  onChange={(e) => { setPrefix(e.target.value); setResult(null); }}
                  placeholder="e.g. “— ”"
                  className="w-32"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Suffix</span>
                <Input
                  type="text" value={suffix} maxLength={12}
                  onChange={(e) => { setSuffix(e.target.value); setResult(null); }}
                  placeholder="e.g. “ —”"
                  className="w-32"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Start counting at</span>
                <input
                  type="number"
                  min={0}
                  value={startAt}
                  onChange={(e) => { setStartAt(Math.max(0, Number(e.target.value) || 0)); setResult(null); }}
                  className="h-10 w-28 rounded-md border border-[var(--border)] bg-[var(--background)] px-3"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">First page to stamp</span>
                <input
                  type="number"
                  min={1}
                  max={total || 1}
                  value={fromPage}
                  onChange={(e) => { setFromPage(Math.min(Math.max(1, Number(e.target.value) || 1), total || 1)); setResult(null); }}
                  className="h-10 w-28 rounded-md border border-[var(--border)] bg-[var(--background)] px-3"
                />
                <span className="text-xs text-[var(--muted-foreground)]">Use 2 to skip a cover page.</span>
              </label>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <div className="flex items-center gap-3">
              <Button onClick={apply} disabled={busy}>
                {busy ? 'Working…' : 'Add page numbers & download'}
              </Button>
            </div>

            {result && <ResultCard bytes={result.bytes} name={result.name} tool="page-numbers" />}
          </div>

          {/* Live preview of where the number lands on page 1. */}
          {thumb && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-full max-w-[280px] overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="First page preview" className="w-full" />
                <span
                  aria-hidden
                  className={cn(
                    'absolute px-2 text-[11px]',
                    bold ? 'font-semibold' : 'font-medium',
                    pnFont === 'serif' && 'font-serif',
                    pnFont === 'mono' && 'font-mono',
                    position.startsWith('top') ? 'top-2' : 'bottom-2',
                    position.endsWith('left') && 'left-2',
                    position.endsWith('right') && 'right-2',
                    position.endsWith('center') && 'left-1/2 -translate-x-1/2',
                  )}
                  style={{ color }}
                >
                  {sample}
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Preview — page {fromPage}</p>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}
