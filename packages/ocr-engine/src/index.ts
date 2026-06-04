/**
 * @pdfshell/ocr-engine
 *
 * Client-side OCR built on Tesseract.js v6. Recognition runs in a WebWorker off
 * the main thread; nothing is uploaded. Feed it canvases rendered by PDF.js.
 *
 * Accuracy note: below ~150 DPI input, recognition drops to 70-80%.
 * Multi-column layouts and tables may scramble. Handwriting is out of scope.
 */
export { OcrEngine, recognizeText, COMMON_LANGUAGES } from './engine.js';
export type {
  OcrImageSource,
  OcrLanguage,
  OcrOptions,
  OcrProgress,
  OcrResult,
  OcrDetailedResult,
  OcrWord,
  OcrBox,
} from './types.js';
