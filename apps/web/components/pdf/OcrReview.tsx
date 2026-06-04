'use client';

import { useRef, useEffect } from 'react';
import type { OcrWord } from '@pdfshell/ocr-engine';
import { cn } from '@/lib/utils';

export interface OcrPageData {
  url: string; // object URL of the rendered page image
  pxWidth: number;
  pxHeight: number;
  words: OcrWord[];
}

/** Confidence buckets drive the heat-map colours. */
function tier(conf: number): 'good' | 'mid' | 'low' {
  if (conf >= 80) return 'good';
  if (conf >= 60) return 'mid';
  return 'low';
}

const boxTier = {
  good: 'border-transparent',
  mid: 'border-amber-400/70 bg-amber-400/15',
  low: 'border-red-500/70 bg-red-500/20',
} as const;

const tokenTier = {
  good: 'text-[var(--foreground)] hover:bg-[var(--surface-2)]',
  mid: 'text-amber-600 dark:text-amber-300 bg-amber-400/10',
  low: 'text-red-500 bg-red-500/10',
} as const;

interface OcrReviewProps {
  page: OcrPageData;
  selected: number | null;
  onSelect: (index: number | null) => void;
}

/**
 * Side-by-side OCR verifier: the page image with word boxes on the left, the
 * recognised words as clickable tokens on the right. Low-confidence words are
 * coloured (amber → red) on both sides; selecting a word highlights it in both,
 * so the user can check a questionable read against the original.
 */
export function OcrReview({ page, selected, onSelect }: OcrReviewProps) {
  const tokenRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (selected != null) {
      tokenRefs.current[selected]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selected]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Left: page image with overlaid word boxes */}
      <div className="relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={page.url} alt="Scanned page" className="block w-full" />
        <div className="absolute inset-0">
          {page.words.map((w, i) => {
            const t = tier(w.confidence);
            const isSel = selected === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(isSel ? null : i)}
                title={`“${w.text}” · ${Math.round(w.confidence)}%`}
                className={cn(
                  'absolute rounded-[2px] border transition-colors',
                  boxTier[t],
                  isSel && 'border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_35%,transparent)]',
                )}
                style={{
                  left: `${(w.bbox.x0 / page.pxWidth) * 100}%`,
                  top: `${(w.bbox.y0 / page.pxHeight) * 100}%`,
                  width: `${((w.bbox.x1 - w.bbox.x0) / page.pxWidth) * 100}%`,
                  height: `${((w.bbox.y1 - w.bbox.y0) / page.pxHeight) * 100}%`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Right: recognised words as tokens */}
      <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 leading-7">
        {page.words.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No words recognised on this page.</p>
        ) : (
          page.words.map((w, i) => {
            const t = tier(w.confidence);
            const isSel = selected === i;
            return (
              <button
                key={i}
                ref={(el) => {
                  tokenRefs.current[i] = el;
                }}
                type="button"
                onClick={() => onSelect(isSel ? null : i)}
                className={cn(
                  'mx-0.5 rounded px-1 text-sm transition-colors',
                  tokenTier[t],
                  isSel && 'bg-[color-mix(in_oklch,var(--brand)_25%,transparent)] ring-1 ring-[var(--brand)]',
                )}
              >
                {w.text}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
