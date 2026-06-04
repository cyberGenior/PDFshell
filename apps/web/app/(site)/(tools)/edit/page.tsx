'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { extractPage, applyEdits, type PageEdit, type EditLine, type FontFamily } from '@/lib/pdfEdit';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob } from '@/lib/utils';
import { track } from '@/lib/track';
import { ChevronLeft, ChevronRight, Trash2, Type, Loader2 } from 'lucide-react';

const TARGET_W = 820;

interface Item extends EditLine {
  id: string;
  page: number; // 0-based
  original: string;
  isNew: boolean;
}

let n = 0;
const uid = () => `t${n++}`;

const cssFamily = (f: FontFamily) =>
  f === 'serif' ? 'Georgia, "Times New Roman", serif' : f === 'mono' ? 'ui-monospace, monospace' : 'Arial, Helvetica, sans-serif';

// Fraction of the font size from an HTML line box's top down to its baseline
// (line-height: 1). Used to seat the overlay on the original text's baseline.
const BASELINE_RATIO = 0.84;

const isDirty = (it: Item) => (it.isNew ? it.text.trim() !== '' : it.text !== it.original);

export default function EditPage() {
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNum, setPageNum] = useState(0); // 0-based
  const [scale, setScale] = useState(1);
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [image, setImage] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedPages, setScannedPages] = useState<Set<number>>(new Set());

  const loaded = useRef<Set<number>>(new Set());

  const loadPage = useCallback(async (idx: number, bytes: Uint8Array) => {
    setLoading(true);
    try {
      const res = await extractPage(bytes, idx);
      setScale(TARGET_W / res.width);
      setDim({ w: res.width, h: res.height });
      setPageCount(res.pageCount);
      setImage(`data:image/png;base64,${res.image}`); // the original page (text included)
      if (res.scanned) setScannedPages((p) => new Set(p).add(idx));
      if (!loaded.current.has(idx)) {
        loaded.current.add(idx);
        const newItems: Item[] = res.lines.map((ln) => ({ ...ln, id: uid(), page: idx, original: ln.text, isNew: false }));
        setItems((prev) => [...prev.filter((it) => it.page !== idx), ...newItems]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this page.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function open(file: File) {
    setError(null);
    const bytes = new Uint8Array(await file.arrayBuffer());
    loaded.current = new Set();
    setItems([]);
    setSelected(null);
    setScannedPages(new Set());
    setPageNum(0);
    setPdf(bytes);
    await loadPage(0, bytes);
  }

  useEffect(() => {
    if (pdf) void loadPage(pageNum, pdf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum]);

  // Drop any blank "add text" box the moment you move off it — clicking empty
  // space starts a new text box, but an empty one should never linger.
  useEffect(() => {
    setItems((p) => p.filter((it) => !(it.isNew && it.text.trim() === '' && it.id !== selected)));
  }, [selected]);

  const setText = (id: string, text: string) => setItems((p) => p.map((it) => (it.id === id ? { ...it, text } : it)));
  const patch = (id: string, pa: Partial<Item>) => setItems((p) => p.map((it) => (it.id === id ? { ...it, ...pa } : it)));

  function addAt(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPt = (e.clientX - rect.left) / scale;
    const yPt = (e.clientY - rect.top) / scale;
    const item: Item = {
      id: uid(), page: pageNum, isNew: true, original: '', text: '',
      bbox: [xPt, yPt, xPt + 80, yPt + 16], origin: [xPt, yPt + 14],
      size: 14, color: '#111111', bold: false, italic: false, family: 'sans', bg: '#ffffff',
    };
    setItems((p) => [...p, item]);
    setSelected(item.id);
  }

  async function save() {
    if (!pdf) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'edit');
    try {
      // Send ONLY the lines that actually changed — each is redrawn in place and
      // everything else on the page stays pristine (original vector text).
      const dirtyItems = items.filter(isDirty);
      const dirtyPages = new Set(dirtyItems.map((it) => it.page));
      if (dirtyPages.size === 0) {
        setError('No changes to save yet.');
        return;
      }
      const pages: PageEdit[] = [...dirtyPages].map((page) => ({
        page,
        lines: dirtyItems
          .filter((it) => it.page === page)
          .map((it) => ({
            text: it.text, origin: it.origin, bbox: it.bbox, size: it.size,
            color: it.color, bold: it.bold, italic: it.italic, family: it.family,
            font: it.font, bg: it.bg,
          })),
      }));
      const out = await applyEdits(pdf, pages);
      downloadBlob(out, 'edited.pdf');
      track('conversion', 'edit');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  const sel = items.find((i) => i.id === selected) ?? null;
  const pageItems = items.filter((i) => i.page === pageNum);

  return (
    <ToolShell slug="edit">
      <ProcessingOverlay show={busy} label="Saving your PDF…" sublabel="Re-rendering edited pages from the lifted text" />

      {!pdf ? (
        <DropZone onFiles={(f) => f[0] && open(f[0])} multiple={false} label="Drop a PDF to edit its text" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => { setSelected(null); setPageNum((p) => Math.max(0, p - 1)); }} disabled={pageNum === 0}><ChevronLeft /></Button>
              <span className="px-1 text-sm text-[var(--muted-foreground)]">Page {pageNum + 1} / {pageCount || 1}</span>
              <Button variant="outline" size="icon-sm" onClick={() => { setSelected(null); setPageNum((p) => Math.min((pageCount || 1) - 1, p + 1)); }} disabled={pageNum >= (pageCount || 1) - 1}><ChevronRight /></Button>
            </div>
            {loading && <span className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"><Loader2 className="size-3.5 animate-spin" /> Lifting page text…</span>}
            <span className="text-xs text-[var(--muted-foreground)]"><Type className="mb-0.5 mr-1 inline size-3.5" />Click any text to edit it in place, or a blank area to add text</span>
            <div className="ml-auto flex gap-2">
              <Button onClick={save} disabled={busy}>Download edited PDF</Button>
              <Button variant="ghost" onClick={() => { setPdf(null); setItems([]); }}>Change file</Button>
            </div>
          </div>

          {sel && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] p-2.5 text-sm">
              <span className="text-[var(--muted-foreground)]">{sel.isNew ? 'New text' : 'Editing text'}</span>
              <label className="flex items-center gap-1">Font
                <select className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-1" value={sel.family} onChange={(e) => patch(sel.id, { family: e.target.value as FontFamily })}>
                  <option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option>
                </select>
              </label>
              <label className="flex items-center gap-1">Size
                <input type="number" min={4} max={200} className="h-9 w-16 rounded-md border border-[var(--border)] bg-[var(--background)] px-2" value={Math.round(sel.size)} onChange={(e) => patch(sel.id, { size: Number(e.target.value) || 12 })} />
              </label>
              <label className="flex items-center gap-1">Colour
                <input type="color" className="h-9 w-9 rounded-md border border-[var(--border)] bg-[var(--background)]" value={sel.color} onChange={(e) => patch(sel.id, { color: e.target.value })} />
              </label>
              <label className="flex items-center gap-1"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={sel.bold} onChange={(e) => patch(sel.id, { bold: e.target.checked })} /> Bold</label>
              <Button variant="ghost" size="sm" onClick={() => { if (sel.isNew) setItems((p) => p.filter((i) => i.id !== sel.id)); else setText(sel.id, ''); setSelected(null); }}>
                <Trash2 className="size-4" /> {sel.isNew ? 'Remove' : 'Erase'}
              </Button>
            </div>
          )}

          <div className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="relative mx-auto shadow-lg" style={{ width: dim.w * scale, height: dim.h * scale }} onClick={addAt}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {image && <img src={image} alt={`Page ${pageNum + 1}`} className="pointer-events-none absolute inset-0 h-full w-full" draggable={false} />}
              {pageItems.map((it) => (
                <RunItem key={it.id} item={it} scale={scale} dirty={isDirty(it)} selected={selected === it.id} onSelect={() => setSelected(it.id)} onChange={(t) => setText(it.id, t)} />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}
    </ToolShell>
  );
}

function RunItem({
  item, scale, dirty, selected, onSelect, onChange,
}: {
  item: Item; scale: number; dirty: boolean; selected: boolean; onSelect: () => void; onChange: (t: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.textContent !== item.text) ref.current.textContent = item.text;
    // A freshly added box gets focus so you can type into it straight away.
    if (item.isNew && item.text === '' && ref.current) ref.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The original text is part of the page image underneath. An existing line
  // stays invisible (so the real document shows in its exact fonts) until you
  // select or edit it — then we cover that spot with its background colour and
  // show the editable text. New text is always shown. This mirrors the save.
  const existing = !item.isNew;
  const active = dirty || selected;
  const hide = existing && !active; // show the original raster underneath
  const cover = existing && active; // mask the original while editing

  // Anchor the overlay to the real text BASELINE (origin), not the line-box top,
  // so it sits exactly where the original glyphs sat. HTML text with line-height:1
  // places its baseline ~0.84× the font size below its top, so we offset by that.
  const top = (item.origin[1] - item.size * BASELINE_RATIO) * scale;

  return (
    <>
      {cover && (
        <div
          aria-hidden
          className="absolute"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          style={{
            left: item.bbox[0] * scale,
            top: item.bbox[1] * scale,
            width: (item.bbox[2] - item.bbox[0]) * scale,
            height: (item.bbox[3] - item.bbox[1]) * scale,
            background: item.bg ?? '#fff',
          }}
        />
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onFocus={onSelect}
        onInput={(e) => onChange(e.currentTarget.textContent ?? '')}
        className={'absolute whitespace-nowrap leading-none outline-none ' + (selected ? 'ring-2 ring-[var(--brand)]' : 'hover:ring-1 hover:ring-[var(--ring)]')}
        style={{
          left: item.bbox[0] * scale,
          top,
          minWidth: item.isNew ? 8 : (item.bbox[2] - item.bbox[0]) * scale,
          fontSize: item.size * scale,
          fontFamily: cssFamily(item.family),
          fontWeight: item.bold ? 700 : 400,
          fontStyle: item.italic ? 'italic' : 'normal',
          color: hide ? 'transparent' : item.color,
          caretColor: item.color,
          cursor: 'text',
          padding: 0,
        }}
      />
    </>
  );
}
