'use client';

import { useRef, useState } from 'react';
import { extractPage } from '@/lib/pdfEdit';
import { redactPdf, type RedactPage } from '@/lib/redact';
import { ServiceUnavailableError } from '@/lib/libreoffice';
import { usePendingDoc } from '@/lib/handoff';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { PrivacyNote } from '@/components/pdf/PrivacyNote';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/Alert';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, outputName, isTooLargeForUpload, MAX_UPLOAD_MB } from '@/lib/utils';
import { toast } from '@/lib/useToast';
import { track } from '@/lib/track';
import { ChevronLeft, ChevronRight, Loader2, X, Eraser } from 'lucide-react';

const TARGET_W = 820;

interface Box {
  id: string;
  page: number; // 0-based
  x: number; // PDF points, top-left origin
  y: number;
  w: number;
  h: number;
}

let counter = 0;
const uid = () => `b${counter++}`;

export default function RedactPage() {
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('document.pdf');
  const [pageNum, setPageNum] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  const draft = useRef<{ startX: number; startY: number } | null>(null);
  const [draftBox, setDraftBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  async function loadPage(idx: number, bytes: Uint8Array) {
    setLoading(true);
    try {
      const res = await extractPage(bytes, idx);
      setScale(TARGET_W / res.width);
      setDim({ w: res.width, h: res.height });
      setPageCount(res.pageCount);
      setImage(`data:image/png;base64,${res.image}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this page.');
    } finally {
      setLoading(false);
    }
  }

  async function open(file: File) {
    setError(null);
    setServiceDown(false);
    setResult(null);
    setFileName(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    setBoxes([]);
    setPageNum(0);
    setPdf(bytes);
    await loadPage(0, bytes);
  }

  usePendingDoc((f) => void open(f));

  function goto(idx: number) {
    if (!pdf || idx < 0 || idx >= (pageCount || 1)) return;
    setPageNum(idx);
    void loadPage(idx, pdf);
  }

  // ---- drawing new boxes on the page ----
  function pagePoint(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  }
  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // clicked an existing box
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = pagePoint(e);
    draft.current = { startX: p.x, startY: p.y };
    setDraftBox({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draft.current) return;
    const p = pagePoint(e);
    const { startX, startY } = draft.current;
    setDraftBox({
      x: Math.min(startX, p.x), y: Math.min(startY, p.y),
      w: Math.abs(p.x - startX), h: Math.abs(p.y - startY),
    });
  }
  function onUp() {
    const d = draftBox;
    draft.current = null;
    setDraftBox(null);
    if (d && d.w > 4 && d.h > 4) {
      setBoxes((p) => [...p, { id: uid(), page: pageNum, ...d }]);
    }
  }

  async function apply() {
    if (!pdf || boxes.length === 0) return;
    if (isTooLargeForUpload(new File([pdf as BlobPart], fileName))) {
      toast.error(`That file is over ${MAX_UPLOAD_MB} MB — please use a smaller PDF.`);
      return;
    }
    setBusy(true);
    setError(null);
    setServiceDown(false);
    track('tool_used', 'redact');
    try {
      const byPage = new Map<number, RedactPage>();
      for (const b of boxes) {
        if (!byPage.has(b.page)) byPage.set(b.page, { page: b.page, boxes: [] });
        byPage.get(b.page)!.boxes.push({ x: b.x, y: b.y, w: b.w, h: b.h });
      }
      const out = await redactPdf(pdf, [...byPage.values()]);
      const name = outputName(fileName, '_redacted');
      downloadBlob(out, name);
      setResult({ bytes: out, name });
      toast.success('Saved to your device.');
      track('conversion', 'redact');
    } catch (e) {
      if (e instanceof ServiceUnavailableError) setServiceDown(true);
      else { setError(e instanceof Error ? e.message : 'Redaction failed.'); toast.error('Redaction failed.'); }
    } finally {
      setBusy(false);
    }
  }

  const pageBoxes = boxes.filter((b) => b.page === pageNum);

  return (
    <ToolShell slug="redact">
      <ProcessingOverlay show={busy} label="Applying redactions…" sublabel="Removing the hidden content on your server" />

      {!pdf ? (
        <DropZone onFiles={(f) => f[0] && open(f[0])} multiple={false} label="Drop a PDF to redact" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => goto(pageNum - 1)} disabled={pageNum === 0}><ChevronLeft /></Button>
              <span className="px-1 text-sm text-[var(--muted-foreground)]">Page {pageNum + 1} / {pageCount || 1}</span>
              <Button variant="outline" size="icon-sm" onClick={() => goto(pageNum + 1)} disabled={pageNum >= (pageCount || 1) - 1}><ChevronRight /></Button>
            </div>
            {loading && <span className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"><Loader2 className="size-3.5 animate-spin" /> Loading page…</span>}
            <span className="text-xs text-[var(--muted-foreground)]"><Eraser className="mb-0.5 mr-1 inline size-3.5" />Drag across anything you want to permanently remove</span>
            <div className="ml-auto flex gap-2">
              {pageBoxes.length > 0 && (
                <Button variant="ghost" onClick={() => setBoxes((p) => p.filter((b) => b.page !== pageNum))}>Clear page</Button>
              )}
              <Button onClick={apply} disabled={busy || boxes.length === 0}>Redact &amp; download</Button>
              <Button variant="ghost" onClick={() => { setPdf(null); setBoxes([]); setResult(null); }}>Change file</Button>
            </div>
          </div>

          <PrivacyNote mode="server" />

          <Alert variant="info">
            Redaction is permanent: the text and images under each box are deleted from the file, not just hidden — they can’t be copied or recovered.
          </Alert>

          <div className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div
              className="relative mx-auto touch-none select-none shadow-lg"
              style={{ width: dim.w * scale, height: dim.h * scale, cursor: 'crosshair' }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {image && <img src={image} alt={`Page ${pageNum + 1}`} className="pointer-events-none absolute inset-0 h-full w-full" draggable={false} />}
              {pageBoxes.map((b) => (
                <RedactRect
                  key={b.id}
                  box={b}
                  scale={scale}
                  onChange={(pa) => setBoxes((p) => p.map((x) => (x.id === b.id ? { ...x, ...pa } : x)))}
                  onRemove={() => setBoxes((p) => p.filter((x) => x.id !== b.id))}
                />
              ))}
              {draftBox && (
                <div
                  className="absolute border border-red-400 bg-black/80"
                  style={{ left: draftBox.x * scale, top: draftBox.y * scale, width: draftBox.w * scale, height: draftBox.h * scale }}
                />
              )}
            </div>
          </div>

          {serviceDown && (
            <Alert variant="warning" title="The processing service is temporarily unavailable.">
              Please try again in a moment.
            </Alert>
          )}
          {error && <Alert variant="error">{error}</Alert>}

          {result && <ResultCard bytes={result.bytes} name={result.name} tool="redact" />}
        </div>
      )}
    </ToolShell>
  );
}

function RedactRect({
  box, scale, onChange, onRemove,
}: {
  box: Box; scale: number; onChange: (patch: Partial<Box>) => void; onRemove: () => void;
}) {
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const resize = useRef<{ px: number; py: number; w: number; h: number } | null>(null);

  function onDragDown(e: React.PointerEvent) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: box.x, y: box.y };
  }
  function onDragMove(e: React.PointerEvent) {
    if (!drag.current) return;
    onChange({
      x: Math.max(0, drag.current.x + (e.clientX - drag.current.px) / scale),
      y: Math.max(0, drag.current.y + (e.clientY - drag.current.py) / scale),
    });
  }
  function onResizeDown(e: React.PointerEvent) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resize.current = { px: e.clientX, py: e.clientY, w: box.w, h: box.h };
  }
  function onResizeMove(e: React.PointerEvent) {
    if (!resize.current) return;
    onChange({
      w: Math.max(8, resize.current.w + (e.clientX - resize.current.px) / scale),
      h: Math.max(8, resize.current.h + (e.clientY - resize.current.py) / scale),
    });
  }

  return (
    <div
      className="group absolute bg-black ring-1 ring-red-400"
      style={{ left: box.x * scale, top: box.y * scale, width: box.w * scale, height: box.h * scale, cursor: 'move' }}
      onPointerDown={onDragDown}
      onPointerMove={onDragMove}
      onPointerUp={() => (drag.current = null)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute -right-2.5 -top-2.5 grid size-5 place-items-center rounded-full bg-[var(--surface)] text-[var(--foreground)] shadow ring-1 ring-[var(--border)] opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove redaction box"
      >
        <X className="size-3" />
      </button>
      <span
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={() => (resize.current = null)}
        className="absolute -bottom-1.5 -right-1.5 size-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-red-500 opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </div>
  );
}
