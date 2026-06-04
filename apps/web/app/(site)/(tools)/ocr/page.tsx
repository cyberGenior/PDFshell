'use client';

import { useRef, useState } from 'react';
import { OcrEngine, COMMON_LANGUAGES, type OcrWord } from '@pdfshell/ocr-engine';
import { loadPdf, renderPageToCanvas } from '@/lib/pdf/render';
import { buildSearchablePdf, type SearchablePage } from '@/lib/pdf/searchablePdf';
import { useAssetConsent } from '@/lib/assetConsent';
import { ToolShell } from '@/components/pdf/ToolShell';
import { DropZone } from '@/components/pdf/DropZone';
import { DataCostNotice } from '@/components/pdf/DataCostNotice';
import { OcrReview, type OcrPageData } from '@/components/pdf/OcrReview';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/ui/Loader';
import { downloadBlob, formatBytes } from '@/lib/utils';
import { track } from '@/lib/track';
import { Camera, ChevronLeft, ChevronRight, FileText, ScanSearch } from 'lucide-react';

// scale 2 ≈ 144 dpi: enough accuracy without blowing memory on low-end devices.
const OCR_SCALE = 2;
const POINTS_PER_PIXEL = 72 / (72 * OCR_SCALE); // map render pixels → original pt

interface PageResult extends OcrPageData {
  jpeg: Uint8Array;
  text: string;
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error('encode failed'))),
      'image/jpeg',
      0.85,
    ),
  );
}

export default function OcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState('eng');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pages, setPages] = useState<PageResult[] | null>(null);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<'review' | 'text'>('review');
  const [edited, setEdited] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const { consented, grant } = useAssetConsent(`ocr-${lang}`);

  function reset(next: File | null) {
    setFile(next);
    setPages(null);
    setSelected(null);
    setActive(0);
    setError(null);
    setStatus(null);
  }

  /** Render the source to one canvas per page (PDF) or a single image. */
  async function renderSource(f: File): Promise<HTMLCanvasElement[]> {
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
      const pdf = await loadPdf(new Uint8Array(await f.arrayBuffer()));
      try {
        const out: HTMLCanvasElement[] = [];
        for (let i = 1; i <= pdf.numPages; i++) out.push(await renderPageToCanvas(pdf, i, OCR_SCALE));
        return out;
      } finally {
        await pdf.destroy();
      }
    }
    const bitmap = await createImageBitmap(f);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    bitmap.close();
    return [canvas];
  }

  async function handleRun() {
    if (!file) return;
    grant();
    track('tool_used', 'ocr');
    setBusy(true);
    setError(null);
    setPages(null);

    const engine = new OcrEngine({
      languages: lang,
      onProgress: (p) => setStatus(`${p.status} ${Math.round(p.progress * 100)}%`),
    });
    try {
      const canvases = await renderSource(file);
      const results: PageResult[] = [];
      for (let i = 0; i < canvases.length; i++) {
        setStatus(`Recognising page ${i + 1} of ${canvases.length}…`);
        const canvas = canvases[i]!;
        const detailed = await engine.recognizeDetailed(canvas);
        const jpeg = await canvasToJpeg(canvas);
        results.push({
          url: URL.createObjectURL(new Blob([jpeg as BlobPart], { type: 'image/jpeg' })),
          pxWidth: canvas.width,
          pxHeight: canvas.height,
          words: detailed.words,
          jpeg,
          text: detailed.text.trim(),
        });
        // Progressive: show what we have so far.
        setPages([...results]);
      }
      setEdited(results.map((r) => r.text).join('\n\n').trim());
      setActive(0);
      setTab('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed.');
    } finally {
      await engine.terminate();
      setBusy(false);
      setStatus(null);
    }
  }

  function downloadSearchable() {
    if (!pages) return;
    const src: SearchablePage[] = pages.map((p) => ({
      jpeg: p.jpeg,
      pxWidth: p.pxWidth,
      pxHeight: p.pxHeight,
      words: p.words,
    }));
    buildSearchablePdf(src, POINTS_PER_PIXEL).then((bytes) =>
      downloadBlob(bytes, (file?.name.replace(/\.[^.]+$/, '') ?? 'ocr') + '_searchable.pdf'),
    );
  }

  const allWords = pages?.reduce((n, p) => n + p.words.length, 0) ?? 0;
  const lowWords =
    pages?.reduce((n, p) => n + p.words.filter((w: OcrWord) => w.confidence < 60).length, 0) ?? 0;
  const avgConf =
    pages && allWords
      ? Math.round(
          pages.reduce((s, p) => s + p.words.reduce((a, w) => a + w.confidence, 0), 0) / allWords,
        )
      : 0;

  return (
    <ToolShell slug="ocr">
      <ProcessingOverlay show={busy} label="Reading your document…" sublabel={status} />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
        Works best on clear, ≥150 dpi scans. Multi-column layouts and tables may come out jumbled,
        and handwriting isn&apos;t supported. Check the amber/red words against the page.
      </div>

      {!file ? (
        <>
          <DropZone
            onFiles={(f) => reset(f[0] ?? null)}
            multiple={false}
            accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
            label="Drop a scanned PDF or image"
          />
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => cameraRef.current?.click()}>
              <Camera /> Take a photo
            </Button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => reset(e.target.files?.[0] ?? null)}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => reset(null)}>Change</Button>
          </div>

          {!pages && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Language</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                disabled={busy}
                className="h-10 w-fit rounded-md border border-[var(--border)] bg-[var(--background)] px-3"
              >
                {COMMON_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <span className="text-xs text-[var(--muted-foreground)]">
                One language at a time, fetched on demand.
              </span>
            </label>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {!pages && !consented ? (
            <DataCostNotice what="the OCR engine + this language" sizeLabel="≈ 12 MB" busy={busy} onAccept={handleRun} />
          ) : !pages ? (
            <Button onClick={handleRun} disabled={busy}>
              {busy ? status ?? 'Working…' : 'Extract text'}
            </Button>
          ) : null}

          {busy && status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}

          {pages && pages.length > 0 && (
            <div className="flex flex-col gap-4">
              {/* Summary + tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1">
                    Avg confidence <strong>{avgConf}%</strong>
                  </span>
                  {lowWords > 0 && (
                    <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-red-500">
                      {lowWords} to check
                    </span>
                  )}
                </div>
                <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-sm">
                  <button
                    onClick={() => setTab('review')}
                    className={`rounded-md px-3 py-1 ${tab === 'review' ? 'bg-[var(--surface-2)] font-medium' : 'text-[var(--muted-foreground)]'}`}
                  >
                    Review
                  </button>
                  <button
                    onClick={() => setTab('text')}
                    className={`rounded-md px-3 py-1 ${tab === 'text' ? 'bg-[var(--surface-2)] font-medium' : 'text-[var(--muted-foreground)]'}`}
                  >
                    Text
                  </button>
                </div>
              </div>

              {tab === 'review' ? (
                <>
                  {pages.length > 1 && (
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon-sm" onClick={() => { setActive((a) => Math.max(0, a - 1)); setSelected(null); }} disabled={active === 0}>
                        <ChevronLeft />
                      </Button>
                      <span className="text-sm text-[var(--muted-foreground)]">Page {active + 1} of {pages.length}</span>
                      <Button variant="outline" size="icon-sm" onClick={() => { setActive((a) => Math.min(pages.length - 1, a + 1)); setSelected(null); }} disabled={active === pages.length - 1}>
                        <ChevronRight />
                      </Button>
                    </div>
                  )}
                  <OcrReview page={pages[active]!} selected={selected} onSelect={setSelected} />
                </>
              ) : (
                <textarea
                  value={edited}
                  onChange={(e) => setEdited(e.target.value)}
                  className="h-[60vh] w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-sm"
                />
              )}

              {/* Exports */}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={downloadSearchable}>
                  <ScanSearch /> Searchable PDF
                </Button>
                <Button variant="outline" onClick={() => downloadBlob(new TextEncoder().encode(edited), (file.name.replace(/\.[^.]+$/, '')) + '.txt', 'text/plain')}>
                  <FileText /> .txt
                </Button>
                <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(edited)}>Copy</Button>
                <Button variant="ghost" onClick={() => reset(file)}>Run again</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}
