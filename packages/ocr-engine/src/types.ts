/**
 * Anything Tesseract.js can recognise text from. In the PDFShell pipeline this
 * is a canvas produced by PDF.js, but blobs, image elements and bitmaps work too.
 */
export type OcrImageSource =
  | HTMLCanvasElement
  | OffscreenCanvas
  | HTMLImageElement
  | ImageBitmap
  | Blob
  | File
  | string;

/**
 * Tesseract language code (e.g. "eng", "fra", "swa"). Multiple languages are
 * joined with "+", e.g. "eng+fra". Over 100 are supported, including several
 * African scripts.
 */
export type OcrLanguage = string;

export interface OcrProgress {
  /** Coarse phase reported by Tesseract, e.g. "loading tesseract core", "recognizing text". */
  status: string;
  /** 0..1 completion of the current phase. */
  progress: number;
}

export interface OcrResult {
  /** Full recognised text. */
  text: string;
  /** Mean confidence across recognised words, 0..100. */
  confidence: number;
}

/** Pixel bounding box in the source image's coordinate space (top-left origin). */
export interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A single recognised word with its location and confidence. */
export interface OcrWord {
  text: string;
  /** 0..100. */
  confidence: number;
  bbox: OcrBox;
}

/** Detailed recognition result: full text plus per-word boxes for verification. */
export interface OcrDetailedResult extends OcrResult {
  words: OcrWord[];
}

export interface OcrOptions {
  /** Language(s) to load. Defaults to "eng". */
  languages?: OcrLanguage | OcrLanguage[];
  /** Progress callback, fired repeatedly during load + recognition. */
  onProgress?: (p: OcrProgress) => void;
  /**
   * Override where Tesseract fetches its core/worker/lang assets. Useful for
   * self-hosting to keep the privacy-first guarantee (no third-party CDN).
   */
  workerPath?: string;
  corePath?: string;
  langPath?: string;
}
