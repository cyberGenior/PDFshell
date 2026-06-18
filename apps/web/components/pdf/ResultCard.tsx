'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Download, Share2, Clock, ArrowRight } from 'lucide-react';
import { loadPdf, renderThumbnail } from '@/lib/pdf/render';
import { recordResult } from '@/lib/stats';
import { keepOutput } from '@/lib/vault';
import { useHandoff } from '@/lib/handoff';
import { useActiveFlow, advanceFlow, exitFlow } from '@/lib/flows';
import { getTool } from '@/lib/tools';
import { SendToTools } from '@/components/pdf/SendToTools';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/Skeleton';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { toast } from '@/lib/useToast';
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
  // 'loading' while we render the PDF page-1 preview; 'idle' once it resolves or
  // fails (or for non-PDF output, where there's no preview to render).
  const [thumbState, setThumbState] = useState<'loading' | 'idle'>(
    mimeType === 'application/pdf' ? 'loading' : 'idle',
  );
  const [canShare, setCanShare] = useState(false);
  const [shared, setShared] = useState(false);
  const [kept, setKept] = useState(false);
  const recorded = useRef(false);
  const router = useRouter();
  const put = useHandoff((s) => s.put);
  const active = useActiveFlow();

  // When this tool is the current step of a running workflow, offer to continue.
  const flowNextSlug =
    active && active.flow.steps[active.step] === tool ? active.flow.steps[active.step + 1] : undefined;
  const flowNextTool = flowNextSlug ? getTool(flowNextSlug) : undefined;
  const flowIsLast = !!active && active.flow.steps[active.step] === tool && active.step === active.flow.steps.length - 1;

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
      } finally {
        if (!cancelled) setThumbState('idle');
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

  function download() {
    downloadBlob(bytes, name, mimeType);
    toast.success('Saved to your device.');
  }

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

  async function keep() {
    try {
      await keepOutput({ name, bytes, tool, mime: mimeType });
      setKept(true);
      toast.success('Kept on this device for 7 days.');
      track('tool_used', `keep:${tool}`);
    } catch {
      toast.error('Couldn’t keep the file (private mode or storage full).');
    }
  }

  function continueFlow() {
    if (!flowNextSlug) return;
    put({ bytes, name });
    track('tool_used', `flow:${tool}->${flowNextSlug}`);
    advanceFlow();
    router.push(`/${flowNextSlug}`);
  }

  const saved = originalSize !== undefined ? originalSize - bytes.byteLength : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-center gap-3">
        {thumbState === 'loading' ? (
          <Skeleton className="h-16 w-12 shrink-0" />
        ) : thumb ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumb}
            alt={`First page of ${name}`}
            loading="lazy"
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
        <Button size="sm" onClick={download}>
          <Download /> Download
        </Button>
        {canShare && (
          <Button size="sm" variant="outline" onClick={share}>
            <Share2 /> {shared ? 'Share again' : 'Share'}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={keep} disabled={kept}>
          <Clock /> {kept ? 'Kept for 7 days' : 'Keep on this device'}
        </Button>
      </div>
      {kept && (
        <p className="-mt-1 text-xs text-[var(--muted-foreground)]">
          Saved to this device only — find it under “Recent files”, auto-deleted after 7 days.
        </p>
      )}

      {flowNextTool && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] p-3">
          <p className="text-sm">
            Next in your workflow: <strong>{flowNextTool.name}</strong>
          </p>
          <Button size="sm" variant="brand" onClick={continueFlow}>
            Continue <ArrowRight />
          </Button>
        </div>
      )}
      {flowIsLast && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <p className="text-sm text-[var(--muted-foreground)]">Workflow complete 🎉</p>
          <Button size="sm" variant="ghost" onClick={exitFlow}>Finish</Button>
        </div>
      )}

      <SendToTools bytes={bytes} name={name} exclude={tool} />
    </motion.div>
  );
}
