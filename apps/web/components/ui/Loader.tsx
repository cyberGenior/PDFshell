'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';

interface ProcessingOverlayProps {
  show: boolean;
  /** Main line, e.g. "Merging pages…". */
  label: string;
  /** Optional live detail, e.g. OCR "Recognising page 2 of 8…". */
  sublabel?: string | null;
  /** Optional note for slow operations, e.g. AI on CPU. */
  hint?: string;
  /** When provided, shows a Cancel button that aborts the operation. */
  onCancel?: () => void;
}

/**
 * Full-screen processing overlay shown while a PDF operation runs (merge, split,
 * compress, OCR, convert). One consistent loader for every flow. Shows an
 * elapsed-seconds counter so long operations (CPU-AI, OCR) never feel frozen.
 */
export function ProcessingOverlay({ show, label, sublabel, hint, onCancel }: ProcessingOverlayProps) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!show) return;
    setSecs(0);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center bg-[var(--background)]/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <motion.div
            initial={{ scale: 0.95, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            className="card-shadow flex w-[min(22rem,90vw)] flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-8 py-7 text-center"
          >
            <span className="relative grid size-12 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full gradient-brand opacity-20" />
              <Loader2 className="size-8 animate-spin text-[var(--brand)]" />
            </span>
            <p className="font-medium">{label}</p>
            {sublabel && <p className="text-sm text-[var(--muted-foreground)]">{sublabel}</p>}
            <p className="text-xs tabular-nums text-[var(--muted-foreground)]">{secs}s elapsed</p>
            {hint && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <ShieldCheck className="size-3.5 text-[oklch(0.6_0.13_160)]" />
              Working — please keep this tab open.
            </p>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="mt-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                Cancel
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small inline spinner for buttons/labels. */
export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}
