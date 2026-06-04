/**
 * @pdfshell/compress-engine
 *
 * MIT-licensed PDF compression. Two strategies:
 *   • compressLossless  — pdf-lib re-save (safe, keeps text, modest gains)
 *   • assembleImagePdf  — rebuild from rasterised pages (opt-in, lossy, big gains)
 *
 * Deliberately avoids Ghostscript-WASM (AGPL + 15.8 MB) — see
 * docs/decisions/0001-compress-without-ghostscript.md.
 */
export { compressLossless, assembleImagePdf, classifyOutcome } from './engine.js';
export type { CompressResult, CompressOutcome, ImagePage } from './engine.js';

export { PRESETS, DEFAULT_PRESET } from './presets.js';
export type { CompressionPreset, PresetInfo } from './presets.js';
