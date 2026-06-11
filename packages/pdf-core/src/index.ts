/**
 * @pdfshell/pdf-core
 *
 * pdf-lib wrapper logic powering PDFShell's Merge, Split, and Edit tools.
 * Pure functions over PDF bytes — works identically in the browser and Node,
 * with no native dependencies and no I/O of its own.
 */
export type { PdfInput, PageRange, PdfMetadata } from './types.js';

export { mergePdfs, assemblePages } from './merge.js';
export type { MergeOptions, PagePick } from './merge.js';

export {
  parsePageRanges,
  extractPages,
  splitByRanges,
  splitEveryNPages,
} from './split.js';

export { getMetadata, setMetadata, getPageCount } from './metadata.js';

export { imagesToPdf } from './images.js';
export type { ImageInput, ImagesToPdfOptions } from './images.js';

export { stampImages } from './stamp.js';
export type { ImageStamp } from './stamp.js';

export { rotatePages, rotateAll, addPageNumbers, addWatermark, cropPages } from './transform.js';
export type {
  PageNumberOptions,
  PageNumberPosition,
  WatermarkOptions,
  CropMargins,
} from './transform.js';
