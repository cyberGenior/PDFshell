'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { assemblePages, type PagePick } from '@pdfshell/pdf-core';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { usePendingDoc } from '@/lib/handoff';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { SendToTools } from '@/components/pdf/SendToTools';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob } from '@/lib/utils';
import { track } from '@/lib/track';
import { X, Loader2 } from 'lucide-react';

interface SourceFile {
  id: string;
  file: File;
}
interface PageItem {
  id: string;
  fileId: string;
  fileName: string;
  page: number; // 1-based within its source
  thumb: string;
}

let seq = 0;
const uid = () => `x${seq++}`;

export default function MergePage() {
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [items, setItems] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  async function addFiles(incoming: File[]) {
    setError(null);
    setLoading(true);
    try {
      for (const file of incoming) {
        const fileId = uid();
        setFiles((prev) => [...prev, { id: fileId, file }]);
        const pdf = await loadPdf(new Uint8Array(await file.arrayBuffer()));
        try {
          const newItems: PageItem[] = [];
          for (let p = 1; p <= pdf.numPages; p++) {
            newItems.push({ id: uid(), fileId, fileName: file.name, page: p, thumb: await renderThumbnail(pdf, p) });
          }
          setItems((prev) => [...prev, ...newItems]);
        } finally {
          await pdf.destroy();
        }
      }
    } catch {
      setError('Could not read one of the PDFs.');
    } finally {
      setLoading(false);
    }
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  usePendingDoc((f) => void addFiles([f]));

  /** Move the dragged tile so it lands at `to` (insert before that position). */
  function reorder(from: number, to: number) {
    if (from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to > from ? to - 1 : to, 0, moved!);
      return next;
    });
  }

  /** Keyboard alternative to drag: swap the focused tile with its neighbour. */
  function moveBy(index: number, delta: -1 | 1) {
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(to, 0, moved!);
      return next;
    });
    setAnnounce(`Moved to position ${to + 1} of ${items.length}.`);
  }

  async function save() {
    if (items.length < 1) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'merge');
    try {
      const sources = await Promise.all(files.map((f) => f.file.arrayBuffer()));
      const picks: PagePick[] = items.map((it) => ({
        sourceIndex: files.findIndex((f) => f.id === it.fileId),
        pageNumber: it.page,
      }));
      const name = files.length === 1 ? files[0]!.file.name.replace(/\.pdf$/i, '') + '_organised.pdf' : 'merged.pdf';
      const bytes = await assemblePages(sources, picks);
      downloadBlob(bytes, name);
      setResult({ bytes, name });
      track('conversion', 'merge');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build the PDF.');
    } finally {
      setBusy(false);
    }
  }

  const singleFile = files.length <= 1;

  return (
    <ToolShell slug="merge">
      <ProcessingOverlay show={busy} label={singleFile ? 'Building your PDF…' : 'Merging pages…'} />
      <DropZone onFiles={addFiles} label="Drop a PDF to reorganise its pages — or several to merge" />

      {loading && (
        <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="size-4 animate-spin" /> Loading pages…
        </p>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {items.length} page{items.length === 1 ? '' : 's'} from {files.length} file
            {files.length === 1 ? '' : 's'}. <strong className="text-[var(--foreground)]">Drag any page</strong> to drop it
            where you want — or focus a page and use the <strong className="text-[var(--foreground)]">arrow keys</strong> to
            move it. The order here is the final document.
          </p>
          {/* Screen-reader announcement for keyboard reordering. */}
          <p aria-live="polite" className="sr-only">{announce}</p>

          <div className="flex flex-wrap gap-3" role="list" aria-label="Pages in output order">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                transition={{ type: 'spring', stiffness: 600, damping: 45 }}
                draggable
                tabIndex={0}
                role="listitem"
                aria-label={`${item.fileName} page ${item.page}, position ${i + 1} of ${items.length}. Use arrow keys to move, Delete to remove.`}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); moveBy(i, -1); }
                  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); moveBy(i, 1); }
                  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(item.id); }
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
                <button
                  onClick={() => remove(item.id)}
                  className="absolute right-3 top-3 z-10 grid size-6 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                  aria-label={`Remove ${item.fileName} page ${item.page}`}
                >
                  <X className="size-3.5" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumb}
                  alt={`${item.fileName} page ${item.page}`}
                  className="pointer-events-none w-full rounded-md border border-[var(--border)] bg-white"
                />
                <p className="mt-1.5 truncate text-center text-[11px] text-[var(--muted-foreground)]" title={`${item.fileName} · p${item.page}`}>
                  p{item.page}
                </p>
              </motion.div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={busy || items.length < 1}>
              {busy ? 'Working…' : singleFile ? 'Save reordered PDF' : `Merge ${items.length} page${items.length === 1 ? '' : 's'} → PDF`}
            </Button>
            <Button variant="ghost" onClick={() => { setFiles([]); setItems([]); setResult(null); }} disabled={busy}>
              Clear
            </Button>
          </div>

          {result && <SendToTools bytes={result.bytes} name={result.name} exclude="merge" />}
        </div>
      )}
    </ToolShell>
  );
}
