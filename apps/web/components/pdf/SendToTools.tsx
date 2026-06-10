'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useHandoff } from '@/lib/handoff';
import { track } from '@/lib/track';

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
 * "Continue with…" strip shown after a tool produces a PDF. Hands the result
 * to the next tool in memory, so the user keeps working without re-uploading.
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

  function send(slug: string) {
    put({ bytes, name });
    track('tool_used', `chain:${exclude}->${slug}`);
    router.push(`/${slug}`);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm font-medium">
        Keep working with <span className="text-[var(--brand)]">{name}</span>
      </p>
      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
        Send the result straight to another tool — no need to add the file again.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TARGETS.filter((t) => t.slug !== exclude).map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => send(t.slug)}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            {t.label} <ArrowRight className="size-3" />
          </button>
        ))}
      </div>
    </div>
  );
}
