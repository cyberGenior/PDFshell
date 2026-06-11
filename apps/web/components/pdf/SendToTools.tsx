'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useHandoff } from '@/lib/handoff';
import { track } from '@/lib/track';

const HINT_KEY = 'pdfshell:chain-hint';

interface Target {
  slug: string;
  label: string;
}

/** Tools that accept a single PDF as input — sensible chaining destinations. */
const TARGETS: Target[] = [
  { slug: 'compress', label: 'Compress' },
  { slug: 'merge', label: 'Organize' },
  { slug: 'split', label: 'Split' },
  { slug: 'rotate', label: 'Rotate' },
  { slug: 'watermark', label: 'Watermark' },
  { slug: 'page-numbers', label: 'Page numbers' },
  { slug: 'crop', label: 'Crop' },
  { slug: 'edit', label: 'Edit' },
  { slug: 'ocr', label: 'OCR' },
  { slug: 'protect', label: 'Protect' },
];

/**
 * "Continue with…" strip shown after a tool produces a PDF (usually inside
 * ResultCard). Hands the result to the next tool in memory, so the user keeps
 * working without re-uploading.
 */
export function SendToTools({
  bytes,
  name,
  exclude,
}: {
  bytes: Uint8Array;
  name: string;
  /** The current tool's slug, so we don't offer a loop back into itself. */
  exclude: string;
}) {
  const router = useRouter();
  const put = useHandoff((s) => s.put);
  const [showHint, setShowHint] = useState(false);

  // A one-time nudge so first-timers notice the chaining strip exists.
  useEffect(() => {
    try {
      if (!localStorage.getItem(HINT_KEY)) setShowHint(true);
    } catch {
      /* private mode / storage blocked — just skip the hint */
    }
  }, []);

  function dismissHint() {
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowHint(false);
  }

  function send(slug: string) {
    dismissHint();
    put({ bytes, name });
    track('tool_used', `chain:${exclude}->${slug}`);
    router.push(`/${slug}`);
  }

  return (
    <div className="relative border-t border-[var(--border)] pt-3">
      {showHint && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] p-2.5 text-xs">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
          <p className="flex-1">
            <strong className="font-semibold">New:</strong> send this file straight into another tool — no re-uploading,
            and it never leaves your device.
          </p>
          <button onClick={dismissHint} aria-label="Dismiss tip" className="rounded-full p-0.5 hover:bg-[var(--surface-2)]">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <p className="text-xs font-medium text-[var(--muted-foreground)]">
        Keep working with another tool — no need to add the file again.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TARGETS.filter((t) => t.slug !== exclude).map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => send(t.slug)}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {t.label} <ArrowRight className="size-3" />
          </button>
        ))}
      </div>
    </div>
  );
}
