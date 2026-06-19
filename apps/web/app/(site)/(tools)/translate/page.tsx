'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { getLanguages, translateDocument, type LangInfo } from '@/lib/translate';
import { ServiceUnavailableError } from '@/lib/libreoffice';
import { usePendingDoc } from '@/lib/handoff';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { PrivacyNote } from '@/components/pdf/PrivacyNote';
import { ResultCard } from '@/components/pdf/ResultCard';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes, outputName, isTooLargeForUpload, MAX_UPLOAD_MB } from '@/lib/utils';
import { toast } from '@/lib/useToast';
import { track } from '@/lib/track';

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
};

export default function TranslatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [langs, setLangs] = useState<LangInfo[]>([]);
  const [source, setSource] = useState('auto');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string; detected: string } | null>(null);

  useEffect(() => {
    getLanguages().then((l) => {
      setLangs(l);
      // Default target to English if available, else the first installed language.
      setTarget((prev) => prev || (l.find((x) => x.code === 'en')?.code ?? l[0]?.code ?? ''));
    });
  }, []);

  usePendingDoc((f) => { setFile(f); setResult(null); });

  const nameOf = (code: string) => langs.find((l) => l.code === code)?.name ?? code.toUpperCase();

  async function run() {
    if (!file || !target) return;
    if (isTooLargeForUpload(file)) {
      toast.error(`That file is over ${MAX_UPLOAD_MB} MB — please use a smaller file.`);
      return;
    }
    setBusy(true);
    setError(null);
    setServiceDown(false);
    setResult(null);
    track('tool_used', 'translate', { source, target });
    try {
      const { bytes, detected } = await translateDocument(file, target, source);
      const name = outputName(file.name, `_${target}`);
      downloadBlob(bytes, name);
      setResult({ bytes, name, detected });
      toast.success('Saved to your device.');
      track('conversion', 'translate', { detected, target });
    } catch (e) {
      if (e instanceof ServiceUnavailableError) setServiceDown(true);
      else { setError(e instanceof Error ? e.message : 'Translation failed.'); toast.error('Translation failed.'); }
    } finally {
      setBusy(false);
    }
  }

  const noLangs = langs.length === 0;

  return (
    <ToolShell slug="translate">
      <ProcessingOverlay show={busy} label="Translating your document…" sublabel="Reading, detecting the language and translating on your server" />

      {!file ? (
        <DropZone
          onFiles={(f) => { setError(null); setServiceDown(false); setResult(null); setFile(f[0] ?? null); }}
          multiple={false}
          accept={ACCEPT}
          label="Drop a PDF or image to translate"
          hint="Take a photo or upload a scan or PDF — the language is detected automatically."
        />
      ) : (
        <div className="flex max-w-2xl flex-col gap-5">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setResult(null); }}>Change</Button>
          </div>
          <PrivacyNote mode="server" />

          {noLangs ? (
            <Alert variant="warning" title="No language packs are installed yet.">
              Ask the site admin to install a language pack (Admin → Languages), then come back.
            </Alert>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">From</span>
                  <Select value={source} onChange={(e) => { setSource(e.target.value); setResult(null); }}>
                    <option value="auto">Detect automatically</option>
                    {langs.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </Select>
                </label>
                <ArrowRight className="mb-2.5 size-4 text-[var(--muted-foreground)]" />
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">To</span>
                  <Select value={target} onChange={(e) => { setTarget(e.target.value); setResult(null); }}>
                    {langs.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </Select>
                </label>
              </div>

              {serviceDown && (
                <Alert variant="warning" title="The translation service is temporarily unavailable.">
                  Please try again in a moment.
                </Alert>
              )}
              {error && <Alert variant="error">{error}</Alert>}

              <div>
                <Button onClick={run} disabled={busy || !target}>
                  {busy ? 'Translating…' : 'Translate & download'}
                </Button>
              </div>

              {result && (
                <>
                  {result.detected && (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Detected <strong>{nameOf(result.detected)}</strong> → translated to <strong>{nameOf(target)}</strong>.
                    </p>
                  )}
                  <ResultCard bytes={result.bytes} name={result.name} tool="translate" />
                </>
              )}
            </>
          )}
        </div>
      )}
    </ToolShell>
  );
}
