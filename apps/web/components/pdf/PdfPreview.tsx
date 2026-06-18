'use client';

import { useEffect, useState } from 'react';
import { FileWarning, Check } from 'lucide-react';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface PdfPreviewProps {
  file: File;
  /** Cap how many pages to render thumbnails for, to bound work on big files. */
  maxPages?: number;
  /** When true, thumbnails become toggle buttons. */
  selectable?: boolean;
  /** 1-based page numbers currently selected. */
  selected?: Set<number>;
  /** Fired when a thumbnail is clicked; `shift` enables range selection. */
  onToggle?: (page: number, shift: boolean) => void;
}

type State =
  | { kind: 'loading'; done: number; total: number }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; thumbs: string[]; total: number };

/**
 * Renders a strip of page thumbnails via PDF.js. States are modelled explicitly
 * (loading / error / ready) — on a slow connection the loading state is the
 * common case, so it must look intentional, not broken (SKILL §5). When
 * `selectable`, each thumbnail is a toggle button for choosing pages directly.
 */
export function PdfPreview({
  file,
  maxPages = 12,
  selectable = false,
  selected,
  onToggle,
}: PdfPreviewProps) {
  const [state, setState] = useState<State>({ kind: 'loading', done: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading', done: 0, total: 0 });

    (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await loadPdf(bytes);
        try {
          const total = pdf.numPages;
          const count = Math.min(total, maxPages);
          const thumbs: string[] = [];
          for (let i = 1; i <= count; i++) {
            if (cancelled) return;
            thumbs.push(await renderThumbnail(pdf, i));
            if (!cancelled) setState({ kind: 'loading', done: i, total: count });
          }
          if (!cancelled) setState({ kind: 'ready', thumbs, total });
        } finally {
          await pdf.destroy();
        }
      } catch (err) {
        if (!cancelled) {
          setState({ kind: 'error', message: err instanceof Error ? err.message : 'Preview failed.' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, maxPages]);

  if (state.kind === 'loading') {
    const placeholders = Math.min(state.total || maxPages, maxPages, 12);
    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: placeholders }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
        <p className="text-xs text-[var(--muted-foreground)]" aria-live="polite">
          Rendering preview{state.total ? ` ${state.done}/${state.total}` : ''}…
        </p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-red-500">
        <FileWarning className="size-4" />
        {state.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {state.thumbs.map((src, i) => {
          const page = i + 1;
          const isSelected = selected?.has(page) ?? false;
          const img = (
            <img
              // eslint-disable-next-line @next/next/no-img-element
              src={src}
              alt={`Page ${page}`}
              className="w-full rounded-lg border border-[var(--border)] bg-white"
            />
          );

          if (!selectable) {
            return (
              <figure key={page} className="flex flex-col items-center gap-1">
                {img}
                <figcaption className="text-xs text-[var(--muted-foreground)]">{page}</figcaption>
              </figure>
            );
          }

          return (
            <button
              key={page}
              type="button"
              onClick={(e) => onToggle?.(page, e.shiftKey)}
              aria-pressed={isSelected}
              className="group relative flex flex-col items-center gap-1 focus:outline-none"
            >
              <span
                className={cn(
                  'relative w-full overflow-hidden rounded-lg ring-2 transition-all',
                  isSelected
                    ? 'ring-[var(--brand)]'
                    : 'ring-transparent group-hover:ring-[var(--border)]',
                )}
              >
                {img}
                {isSelected && (
                  <span className="absolute inset-0 bg-[color-mix(in_oklch,var(--brand)_24%,transparent)]" />
                )}
                <span
                  className={cn(
                    'absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full border transition-all',
                    isSelected
                      ? 'gradient-brand border-transparent text-white'
                      : 'border-[var(--border)] bg-black/40 text-transparent group-hover:text-white/60',
                  )}
                >
                  <Check className="size-3" />
                </span>
              </span>
              <span
                className={cn(
                  'text-xs',
                  isSelected ? 'font-medium text-[var(--foreground)]' : 'text-[var(--muted-foreground)]',
                )}
              >
                {page}
              </span>
            </button>
          );
        })}
      </div>
      {state.total > state.thumbs.length && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Showing first {state.thumbs.length} of {state.total} pages
          {selectable && ' — use “Select all” for pages beyond these'}.
        </p>
      )}
    </div>
  );
}
