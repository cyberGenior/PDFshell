'use client';

import { useRef, useState } from 'react';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { extractForm, fillForm, type FormInfo, type FormField } from '@/lib/forms';
import { usePendingDoc } from '@/lib/handoff';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { PrivacyNote } from '@/components/pdf/PrivacyNote';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/Alert';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, outputName, cn } from '@/lib/utils';
import { toast } from '@/lib/useToast';
import { track } from '@/lib/track';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const TARGET_W = 820;
type Values = Record<string, string | boolean>;

export default function FillPage() {
  const [fileName, setFileName] = useState('document.pdf');
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [info, setInfo] = useState<FormInfo | null>(null);
  const [values, setValues] = useState<Values>({});
  const [pageNum, setPageNum] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [flatten, setFlatten] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noFields, setNoFields] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  const docRef = useRef<Awaited<ReturnType<typeof loadPdf>> | null>(null);

  async function renderPage(idx: number, pageWidthPts: number) {
    if (!docRef.current) return;
    setLoading(true);
    try {
      setScale(TARGET_W / pageWidthPts);
      setImage(await renderThumbnail(docRef.current, idx + 1, TARGET_W));
    } finally {
      setLoading(false);
    }
  }

  async function open(file: File) {
    setError(null);
    setResult(null);
    setNoFields(false);
    setFileName(file.name);
    const buf = new Uint8Array(await file.arrayBuffer());
    try {
      const form = await extractForm(buf);
      if (form.fields.length === 0) {
        setBytes(buf);
        setInfo(null);
        setNoFields(true);
        return;
      }
      // Seed values from the field defaults.
      const seed: Values = {};
      for (const f of form.fields) {
        seed[f.name] = f.kind === 'checkbox' ? !!f.checked : (f.value ?? '');
      }
      if (docRef.current) await docRef.current.destroy();
      docRef.current = await loadPdf(buf);
      setBytes(buf);
      setInfo(form);
      setValues(seed);
      setPageNum(0);
      await renderPage(0, form.pageSizes[0]!.width);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this PDF.');
    }
  }

  usePendingDoc((f) => void open(f));

  function goto(idx: number) {
    if (!info || idx < 0 || idx >= info.pageCount) return;
    setPageNum(idx);
    void renderPage(idx, info.pageSizes[idx]!.width);
  }

  function reset() {
    if (docRef.current) { void docRef.current.destroy(); docRef.current = null; }
    setBytes(null); setInfo(null); setNoFields(false); setResult(null); setImage(null);
  }

  async function save() {
    if (!bytes || !info) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'fill');
    try {
      const out = await fillForm(bytes, values, flatten);
      const name = outputName(fileName, '_filled');
      downloadBlob(out, name);
      setResult({ bytes: out, name });
      toast.success('Saved to your device.');
      track('conversion', 'fill');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fill the form.');
      toast.error('Could not fill the form.');
    } finally {
      setBusy(false);
    }
  }

  // Fields with a widget on the current page (one control per field).
  const pageFields = (info?.fields ?? [])
    .map((f) => ({ field: f, w: f.widgets.find((w) => w.page === pageNum) }))
    .filter((x): x is { field: FormField; w: NonNullable<typeof x.w> } => !!x.w);

  return (
    <ToolShell slug="fill">
      <ProcessingOverlay show={busy} label="Filling your form…" />

      {!bytes ? (
        <DropZone onFiles={(f) => f[0] && open(f[0])} multiple={false} label="Drop a fillable PDF form" hint="Detects form fields and fills them on your device." />
      ) : noFields ? (
        <div className="flex flex-col gap-4">
          <Alert variant="info" title="This PDF has no fillable form fields.">
            It isn’t an interactive AcroForm. To type onto it anyway, use the <strong>Edit</strong> tool
            to place text anywhere on the page.
          </Alert>
          <div><Button variant="ghost" onClick={reset}>Choose another file</Button></div>
        </div>
      ) : info ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => goto(pageNum - 1)} disabled={pageNum === 0}><ChevronLeft /></Button>
              <span className="px-1 text-sm text-[var(--muted-foreground)]">Page {pageNum + 1} / {info.pageCount}</span>
              <Button variant="outline" size="icon-sm" onClick={() => goto(pageNum + 1)} disabled={pageNum >= info.pageCount - 1}><ChevronRight /></Button>
            </div>
            {loading && <span className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"><Loader2 className="size-3.5 animate-spin" /> Loading page…</span>}
            <span className="text-xs text-[var(--muted-foreground)]">{info.fields.length} field{info.fields.length === 1 ? '' : 's'} detected</span>
            <label className="ml-2 flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} className="size-4 accent-[var(--brand)]" />
              Flatten (lock the answers)
            </label>
            <div className="ml-auto flex gap-2">
              <Button onClick={save} disabled={busy}>Fill &amp; download</Button>
              <Button variant="ghost" onClick={reset}>Change file</Button>
            </div>
          </div>

          <PrivacyNote mode="device" />

          <div className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="relative mx-auto shadow-lg" style={{ width: (info.pageSizes[pageNum]!.width) * scale, height: (info.pageSizes[pageNum]!.height) * scale }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {image && <img src={image} alt={`Page ${pageNum + 1}`} className="pointer-events-none absolute inset-0 h-full w-full" draggable={false} />}
              {pageFields.map(({ field, w }) => (
                <FieldControl
                  key={field.name}
                  field={field}
                  style={{ left: w.x * scale, top: w.y * scale, width: w.w * scale, height: w.h * scale }}
                  value={values[field.name]}
                  onChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v }))}
                />
              ))}
            </div>
          </div>

          {error && <Alert variant="error">{error}</Alert>}
          {result && <ResultCard bytes={result.bytes} name={result.name} tool="fill" />}
        </div>
      ) : null}
    </ToolShell>
  );
}

function FieldControl({
  field, style, value, onChange,
}: {
  field: FormField;
  style: React.CSSProperties;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
}) {
  const base = 'absolute rounded-sm border border-[var(--brand)]/60 bg-[color-mix(in_oklch,var(--brand)_6%,white)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--ring)]/40';
  const fontSize = Math.max(9, Math.min(16, Number(style.height ?? 16) * 0.6));

  if (field.kind === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={!!value}
        disabled={field.readOnly}
        onChange={(e) => onChange(e.target.checked)}
        style={style}
        className="absolute size-4 accent-[var(--brand)]"
        aria-label={field.name}
      />
    );
  }

  if (field.kind === 'dropdown' || field.kind === 'radio') {
    return (
      <select
        value={String(value ?? '')}
        disabled={field.readOnly}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...style, fontSize }}
        className={cn(base, 'px-1')}
        aria-label={field.name}
      >
        <option value=""></option>
        {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (field.multiline) {
    return (
      <textarea
        value={String(value ?? '')}
        readOnly={field.readOnly}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...style, fontSize }}
        className={cn(base, 'resize-none px-1 py-0.5')}
        aria-label={field.name}
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? '')}
      readOnly={field.readOnly}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...style, fontSize }}
      className={cn(base, 'px-1')}
      aria-label={field.name}
    />
  );
}
