import { createWorker, type Worker } from 'tesseract.js';
import type {
  OcrImageSource,
  OcrLanguage,
  OcrOptions,
  OcrResult,
  OcrDetailedResult,
  OcrWord,
} from './types.js';

function normaliseLangs(langs: OcrOptions['languages']): string {
  if (!langs) return 'eng';
  return Array.isArray(langs) ? langs.join('+') : langs;
}

/**
 * A reusable OCR engine wrapping a single Tesseract.js worker.
 *
 * Tesseract.js v6 runs the heavy recognition loop off the main thread in its
 * own WebWorker, so the UI stays responsive. Create one engine, reuse it across
 * many pages, and call {@link terminate} when done to free the worker + WASM.
 */
export class OcrEngine {
  private workerPromise: Promise<Worker> | null = null;
  private readonly langs: string;

  constructor(private readonly options: OcrOptions = {}) {
    this.langs = normaliseLangs(options.languages);
  }

  /** Lazily create (once) and return the underlying Tesseract worker. */
  private async getWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      const { workerPath, corePath, langPath, onProgress } = this.options;
      this.workerPromise = createWorker(this.langs, undefined, {
        ...(workerPath ? { workerPath } : {}),
        ...(corePath ? { corePath } : {}),
        ...(langPath ? { langPath } : {}),
        logger: onProgress
          ? (m) => onProgress({ status: m.status, progress: m.progress })
          : undefined,
      });
    }
    return this.workerPromise;
  }

  /** Warm up the worker and language data ahead of the first recognise call. */
  async init(): Promise<void> {
    await this.getWorker();
  }

  /** Recognise text from a single image source. */
  async recognize(image: OcrImageSource): Promise<OcrResult> {
    const worker = await this.getWorker();
    // Tesseract's published ImageLike type is narrower than what it accepts at
    // runtime (e.g. ImageBitmap works but isn't in the type). Our OcrImageSource
    // is the accurate set, so we bridge the gap with a single cast here.
    const { data } = await worker.recognize(image as Parameters<typeof worker.recognize>[0]);
    return { text: data.text, confidence: data.confidence };
  }

  /**
   * Recognise text AND return per-word bounding boxes + confidence, so the UI
   * can overlay the words on the source image, flag low-confidence words, and
   * build a searchable PDF. Boxes are in the source image's pixel coordinates.
   */
  async recognizeDetailed(image: OcrImageSource): Promise<OcrDetailedResult> {
    const worker = await this.getWorker();
    const { data } = await worker.recognize(
      image as Parameters<typeof worker.recognize>[0],
      {},
      { blocks: true, text: true },
    );

    const words: OcrWord[] = [];
    // v6 nests words in blocks → paragraphs → lines → words; older shapes expose
    // data.words directly. Handle both defensively.
    const collect = (w: { text: string; confidence: number; bbox: OcrWord['bbox'] }) => {
      if (w?.text?.trim() && w.bbox) {
        words.push({ text: w.text, confidence: w.confidence, bbox: w.bbox });
      }
    };
    const anyData = data as unknown as {
      words?: Array<Parameters<typeof collect>[0]>;
      blocks?: Array<{
        paragraphs?: Array<{ lines?: Array<{ words?: Array<Parameters<typeof collect>[0]> }> }>;
      }>;
    };
    if (Array.isArray(anyData.words) && anyData.words.length) {
      anyData.words.forEach(collect);
    } else {
      for (const block of anyData.blocks ?? [])
        for (const para of block.paragraphs ?? [])
          for (const line of para.lines ?? [])
            for (const word of line.words ?? []) collect(word);
    }

    return { text: data.text, confidence: data.confidence, words };
  }

  /**
   * Recognise a sequence of images (e.g. one canvas per PDF page) in order,
   * returning one result per input.
   */
  async recognizeMany(images: OcrImageSource[]): Promise<OcrResult[]> {
    const results: OcrResult[] = [];
    for (const image of images) {
      results.push(await this.recognize(image));
    }
    return results;
  }

  /** Tear down the worker and release its WASM memory. */
  async terminate(): Promise<void> {
    if (this.workerPromise) {
      const worker = await this.workerPromise;
      await worker.terminate();
      this.workerPromise = null;
    }
  }
}

/**
 * One-shot convenience: recognise a single image without managing an engine
 * lifecycle. Spins up a worker, runs, then tears it down.
 */
export async function recognizeText(
  image: OcrImageSource,
  options: OcrOptions = {},
): Promise<OcrResult> {
  const engine = new OcrEngine(options);
  try {
    return await engine.recognize(image);
  } finally {
    await engine.terminate();
  }
}

/** Languages PDFShell surfaces first in the UI. The full set is 100+. */
export const COMMON_LANGUAGES: ReadonlyArray<{ code: OcrLanguage; label: string }> = [
  { code: 'eng', label: 'English' },
  { code: 'fra', label: 'French' },
  { code: 'spa', label: 'Spanish' },
  { code: 'deu', label: 'German' },
  { code: 'por', label: 'Portuguese' },
  { code: 'ara', label: 'Arabic' },
  { code: 'swa', label: 'Swahili' },
  { code: 'hau', label: 'Hausa' },
  { code: 'amh', label: 'Amharic' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
];
