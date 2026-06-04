import { PDFDocument } from 'pdf-lib';

/** Whether the operation shrank, didn't meaningfully change, or grew the file. */
export type CompressOutcome = 'smaller' | 'unchanged' | 'larger';

export interface CompressResult {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  /** Fraction saved, e.g. 0.31 = 31% smaller. Negative means the file grew. */
  ratio: number;
  outcome: CompressOutcome;
  /** True when we returned the untouched original because compressing didn't help. */
  keptOriginal: boolean;
}

/** Classify a size change, with a ±1% dead-zone treated as "unchanged". */
export function classifyOutcome(originalSize: number, compressedSize: number): CompressOutcome {
  const ratio = 1 - compressedSize / originalSize;
  if (ratio > 0.01) return 'smaller';
  if (ratio < -0.01) return 'larger';
  return 'unchanged';
}

function result(input: Uint8Array, output: Uint8Array, keptOriginal = false): CompressResult {
  return {
    bytes: output,
    originalSize: input.byteLength,
    compressedSize: output.byteLength,
    ratio: 1 - output.byteLength / input.byteLength,
    outcome: classifyOutcome(input.byteLength, output.byteLength),
    keptOriginal,
  };
}

/**
 * Lossless compression: re-serialise the PDF with object streams enabled, which
 * drops unreferenced objects and packs the cross-reference table. Text stays
 * selectable and nothing is re-encoded.
 *
 * A compressor must never hand back a bigger file. Re-saving an already-optimised
 * (or linearised) PDF can grow it slightly, so if the result isn't smaller we
 * keep the user's original bytes and report `keptOriginal`.
 */
export async function compressLossless(input: Uint8Array): Promise<CompressResult> {
  const doc = await PDFDocument.load(input, { ignoreEncryption: true });
  const output = await doc.save({ useObjectStreams: true });

  if (output.byteLength >= input.byteLength) {
    return {
      bytes: input,
      originalSize: input.byteLength,
      compressedSize: input.byteLength,
      ratio: 0,
      outcome: 'unchanged',
      keptOriginal: true,
    };
  }
  return result(input, output);
}

/** One rasterised page destined for the rebuilt PDF (flatten path). */
export interface ImagePage {
  /** JPEG-encoded page image bytes. */
  jpeg: Uint8Array;
  /** Page width in PDF points (1/72 inch). */
  widthPt: number;
  /** Page height in PDF points. */
  heightPt: number;
}

/**
 * Aggressive/flatten path: rebuild a PDF from already-rasterised JPEG pages.
 *
 * The rasterisation itself (PDF.js → canvas → JPEG at a preset DPI) happens in
 * the browser app, because it needs a canvas. This function is the pure,
 * environment-agnostic assembly step, so it stays testable in Node.
 *
 * Trade-offs the UI MUST surface: the output is image-only (selectable text is
 * lost), and for text-heavy PDFs rasterising every page can make the file
 * LARGER than the original — so the result's `outcome` may be 'larger'. The
 * caller is responsible for not foisting a bigger file on the user.
 */
export async function assembleImagePdf(
  pages: ImagePage[],
  original: Uint8Array,
): Promise<CompressResult> {
  if (pages.length === 0) throw new Error('No pages to assemble.');

  const out = await PDFDocument.create();
  for (const { jpeg, widthPt, heightPt } of pages) {
    const img = await out.embedJpg(jpeg);
    const page = out.addPage([widthPt, heightPt]);
    page.drawImage(img, { x: 0, y: 0, width: widthPt, height: heightPt });
  }
  const output = await out.save({ useObjectStreams: true });
  return result(original, output);
}
