'use client';

import { useState } from 'react';
import { extractPages, splitByRanges, getPageCount } from '@pdfshell/pdf-core';
import { usePendingDoc } from '@/lib/handoff';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { PdfPreview } from '@/components/pdf/PdfPreview';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [separate, setSeparate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  async function selectFile(files: File[]) {
    const next = files[0];
    if (!next) return;
    setError(null);
    setFile(next);
    setSelected(new Set());
    setLastClicked(null);
    setResult(null);
    try {
      setPageCount(await getPageCount(await next.arrayBuffer()));
    } catch {
      setPageCount(null);
      setError('Could not read this PDF.');
    }
  }

  usePendingDoc((f) => void selectFile([f]));

  function toggle(page: number, shift: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && lastClicked !== null) {
        // Range select from the last clicked page to this one.
        const [lo, hi] = [Math.min(lastClicked, page), Math.max(lastClicked, page)];
        for (let p = lo; p <= hi; p++) next.add(p);
      } else if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
      }
      return next;
    });
    setLastClicked(page);
  }

  function setAll(predicate?: (p: number) => boolean) {
    if (!pageCount) return;
    const next = new Set<number>();
    for (let p = 1; p <= pageCount; p++) if (!predicate || predicate(p)) next.add(p);
    setSelected(next);
  }

  async function handleSplit() {
    if (!file || selected.size === 0) return;
    setBusy(true);
    setError(null);
    track('tool_used', 'split');
    try {
      const pages = [...selected].sort((a, b) => a - b);
      const buffer = await file.arrayBuffer();
      const base = file.name.replace(/\.pdf$/i, '');

      if (separate) {
        // One PDF per selected page.
        const parts = await splitByRanges(buffer, pages.map((p) => ({ start: p, end: p })));
        parts.forEach((bytes, i) => downloadBlob(bytes, `${base}_p${pages[i]}.pdf`));
        setResult(null);
      } else {
        // One PDF containing exactly the selected pages, in order.
        const out = await extractPages(buffer, pages);
        downloadBlob(out, `${base}_extract.pdf`);
        setResult({ bytes: out, name: `${base}_extract.pdf` });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell slug="split">
      <ProcessingOverlay show={busy} label={separate ? 'Splitting into files…' : 'Extracting pages…'} />
      {!file ? (
        <DropZone onFiles={selectFile} multiple={false} label="Drop a PDF here, or click to browse" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {formatBytes(file.size)}
                {pageCount !== null && ` · ${pageCount} pages`}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setPageCount(null); }}>
              Change
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-medium">Select pages:</span>
            <Button variant="outline" size="sm" onClick={() => setAll()}>All</Button>
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>None</Button>
            <Button variant="outline" size="sm" onClick={() => setAll((p) => p % 2 === 1)}>Odd</Button>
            <Button variant="outline" size="sm" onClick={() => setAll((p) => p % 2 === 0)}>Even</Button>
            <span className="text-xs text-[var(--muted-foreground)]">
              Tip: click a page, then shift-click another to select the range.
            </span>
          </div>

          <PdfPreview file={file} maxPages={60} selectable selected={selected} onToggle={toggle} />

          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={separate}
              onChange={(e) => setSeparate(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Export each selected page as its own file
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={handleSplit} disabled={selected.size === 0 || busy}>
              {busy
                ? 'Working…'
                : separate
                  ? `Split ${selected.size} page${selected.size === 1 ? '' : 's'} → ${selected.size} files`
                  : `Extract ${selected.size} page${selected.size === 1 ? '' : 's'} → 1 PDF`}
            </Button>
            {selected.size === 0 && (
              <span className="text-sm text-[var(--muted-foreground)]">Select at least one page.</span>
            )}
          </div>

          {result && <ResultCard bytes={result.bytes} name={result.name} tool="split" originalSize={file.size} />}
        </div>
      )}
    </ToolShell>
  );
}
