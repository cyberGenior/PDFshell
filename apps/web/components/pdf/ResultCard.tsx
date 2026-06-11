'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, Share2 } from 'lucide-react';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { recordResult } from '@/lib/stats';
import { SendToTools } from '@/components/pdf/SendToTools';
import { Button } from '@/components/ui/button';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';

interface ResultCardProps {
  bytes: Uint8Array;
  name: string;
  /** The producing tool's slug — excluded from the chaining strip. */
  tool: string;
  /** When given, the card shows the size saving (and credits local stats). */
  originalSize?: number;
  mimeType?: string;
}

/**
 * The post-task moment, upgraded: a success card with a live thumbnail of the
 * output, Download, native Share (→ WhatsApp/email on mobile via the Web Share
 * API), and the "keep working" chaining strip. Files shared/downloaded here
 * never touch a server — sharing hands the bytes to the OS share sheet.
 */
export function ResultCard({ bytes, name, tool, originalSize, mimeType = 'application/pdf' }: ResultCardProps) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [shared, setShared] = useState(false);
  const recorded = useRef(false);

  // Count the result once per card (not per re-render).
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    recordResult(tool, originalSize, bytes.byteLength);
  }, [tool, originalSize, bytes]);

  // Page-1 thumbnail of the actual output, so the user sees what they made.
  useEffect(() => {
    let cancelled = false;
    if (mimeType !== 'application/pdf') return;
    (async () => {
      try {
        const pdf = await loadPdf(bytes);
        try {
          const url = await renderThumbnail(pdf, 1, 96);
          if (!cancelled) setThumb(url);
        } finally {
          await pdf.destroy();
        }
      } catch {
        /* thumbnail is decorative — the card works without it */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bytes, mimeType]);

  useEffect(() => {
    const file = new File([bytes as BlobPart], name, { type: mimeType });
    setCanShare(typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] }));
  }, [bytes, name, mimeType]);

  async function share() {
    const file = new File([bytes as BlobPart], name, { type: mimeType });
    try {
      await navigator.share({ files: [file], title: name });
      setShared(true);
      track('tool_used', `share:${tool}`);
    } catch {
      /* user dismissed the share sheet — not an error */
    }
  }

  const saved = originalSize !== undefined ? originalSize - bytes.byteLength : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-center gap-3">
        {thumb ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumb}
            alt={`First page of ${name}`}
            className="h-16 w-12 shrink-0 rounded-md border border-[var(--border)] bg-white object-cover shadow-sm"
          />
        ) : (
          <motion.span
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-[oklch(0.65_0.15_150)]/15"
          >
            <Check className="size-6 text-[oklch(0.55_0.15_150)]" />
          </motion.span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {formatBytes(bytes.byteLength)}
            {saved > 0 && (
              <span className="ml-1.5 text-[oklch(0.55_0.15_150)]">· {formatBytes(saved)} saved</span>
            )}
            <span className="ml-1.5">· ready on your device</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => downloadBlob(bytes, name, mimeType)}>
          <Download /> Download
        </Button>
        {canShare && (
          <Button size="sm" variant="outline" onClick={share}>
            <Share2 /> {shared ? 'Share again' : 'Share'}
          </Button>
        )}
      </div>

      <SendToTools bytes={bytes} name={name} exclude={tool} />
    </motion.div>
  );
}
