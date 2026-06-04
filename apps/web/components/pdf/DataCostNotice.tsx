'use client';

import { Download, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataCostNoticeProps {
  /** Human download size, e.g. "≈ 12 MB". */
  sizeLabel: string;
  /** What the download is for, e.g. "the English OCR engine". */
  what: string;
  onAccept: () => void;
  busy?: boolean;
}

/**
 * One-time, explicit consent before fetching a large asset. Respecting metered
 * data is a usability requirement in this market, not a nicety — so we name the
 * cost and the fact that it's cached afterwards before spending the user's data.
 */
export function DataCostNotice({ sizeLabel, what, onAccept, busy }: DataCostNoticeProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 p-4">
      <div className="flex items-start gap-3">
        <Wifi className="mt-0.5 size-5 shrink-0 text-[var(--primary)]" />
        <div className="text-sm">
          <p className="font-medium">
            This downloads {what} ({sizeLabel}) the first time.
          </p>
          <p className="mt-1 text-[var(--muted-foreground)]">
            It runs entirely on your device and is cached afterwards, so you only pay for the
            data once — even offline next time.
          </p>
        </div>
      </div>
      <Button onClick={onAccept} disabled={busy} className="w-fit">
        <Download className="size-4" />
        {busy ? 'Downloading…' : `Download & continue (${sizeLabel})`}
      </Button>
    </div>
  );
}
