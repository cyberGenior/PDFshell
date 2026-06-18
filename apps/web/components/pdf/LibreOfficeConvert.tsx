'use client';

import { useEffect, useState } from 'react';
import type { Accept } from 'react-dropzone';
import { Sparkles } from 'lucide-react';
import {
  convertViaLibreOffice,
  aiStatus,
  ServiceUnavailableError,
  type ConvertTarget,
} from '@/lib/libreoffice';
import { ConvertHeader } from '@/components/pdf/ConvertHeader';
import { DropZone } from '@/components/pdf/DropZone';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes, isTooLargeForUpload, MAX_UPLOAD_MB } from '@/lib/utils';
import { toast } from '@/lib/useToast';
import { track } from '@/lib/track';

interface LibreOfficeConvertProps {
  slug: string;
  target: ConvertTarget;
  accept: Accept;
  label: string;
  /** Output file extension, e.g. "docx". */
  outExt: string;
  outMime: string;
  /** Offer the opt-in local-AI enhancement (PDF→PowerPoint). */
  enhanceable?: boolean;
}

/**
 * Shared UI for the server-backed (LibreOffice) conversions. Degrades clearly
 * when the service isn't running. For enhanceable conversions it also offers an
 * opt-in "Enhance with AI" using the self-hosted local model.
 */
export function LibreOfficeConvert({
  slug,
  target,
  accept,
  label,
  outExt,
  outMime,
  enhanceable = false,
}: LibreOfficeConvertProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const [ai, setAi] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [aiModel, setAiModel] = useState('');

  useEffect(() => {
    if (enhanceable) aiStatus().then((s) => { setAiReady(s.available); setAiModel(s.model); });
  }, [enhanceable]);

  async function run() {
    if (!file) return;
    if (isTooLargeForUpload(file)) {
      toast.error(`That file is over ${MAX_UPLOAD_MB} MB — please use a smaller file.`);
      return;
    }
    setBusy(true);
    setError(null);
    setServiceDown(false);
    track('tool_used', slug, { ai: ai && aiReady });
    try {
      const bytes = await convertViaLibreOffice(file, target, { ai: ai && aiReady });
      downloadBlob(bytes, file.name.replace(/\.[^.]+$/, '') + '.' + outExt, outMime);
      track('conversion', target, { ai: ai && aiReady });
    } catch (err) {
      if (err instanceof ServiceUnavailableError) setServiceDown(true);
      else setError(err instanceof Error ? err.message : 'Conversion failed.');
      track('error', slug);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ProcessingOverlay
        show={busy}
        label={ai && aiReady ? 'Enhancing with AI…' : `Converting to ${outExt.toUpperCase()}…`}
        sublabel={ai && aiReady ? 'Your local model is re-authoring the document' : 'Processing on your server'}
        hint={ai && aiReady ? 'Local AI on CPU can take ~20–60s for a multi-page document.' : undefined}
      />
      <ConvertHeader slug={slug} />

      {!file ? (
        <DropZone onFiles={(f) => { setError(null); setServiceDown(false); setFile(f[0] ?? null); }} multiple={false} accept={accept} label={label} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
          </div>

          {enhanceable && (
            <label
              className={
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ' +
                (ai && aiReady ? 'border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)]' : 'border-[var(--border)]') +
                (aiReady ? '' : ' opacity-60')
              }
            >
              <input
                type="checkbox"
                checked={ai}
                disabled={!aiReady}
                onChange={(e) => setAi(e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--brand)]"
              />
              <span className="text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="size-4 text-[var(--brand)]" /> Enhance with AI
                  {aiReady ? (
                    <span className="text-xs font-normal text-[var(--muted-foreground)]">· local {aiModel}</span>
                  ) : (
                    <span className="text-xs font-normal text-[var(--muted-foreground)]">· model not running</span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                  Re-authors the document into a clean, grouped deck using your self-hosted local
                  model. Runs on your machine — nothing goes to a third party.
                </span>
              </span>
            </label>
          )}

          {serviceDown && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium">The conversion service is temporarily unavailable.</p>
              <p className="mt-1">Please try again in a moment.</p>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div>
            <Button onClick={run} disabled={busy}>
              {busy ? (ai && aiReady ? 'Enhancing with AI…' : 'Converting…') : `Convert to ${outExt.toUpperCase()}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
