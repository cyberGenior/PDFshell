import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import type { PdfInput } from './types.js';
import { loadDocument } from './internal.js';

/**
 * Page transforms powering the Rotate, Page numbers, Watermark and Crop tools.
 * Pure functions over PDF bytes — entirely client-safe (pdf-lib only).
 */

/**
 * Rotate pages by a clockwise delta in degrees (must be a multiple of 90).
 *
 * @param rotations Map of 1-based page number → delta. Use {@link rotateAll}
 *                  to rotate every page by the same amount.
 */
export async function rotatePages(
  input: PdfInput,
  rotations: ReadonlyMap<number, number> | Record<number, number>,
): Promise<Uint8Array> {
  const entries =
    rotations instanceof Map
      ? [...rotations.entries()]
      : Object.entries(rotations).map(([k, v]) => [Number(k), v] as [number, number]);
  if (entries.length === 0) throw new Error('No rotations were provided.');

  const doc = await loadDocument(input);
  const total = doc.getPageCount();

  for (const [pageNumber, delta] of entries) {
    if (delta % 90 !== 0) throw new Error(`Rotation must be a multiple of 90; got ${delta}.`);
    if (pageNumber < 1 || pageNumber > total) {
      throw new Error(`Page ${pageNumber} is out of bounds (1-${total}).`);
    }
    const page = doc.getPage(pageNumber - 1);
    const current = page.getRotation().angle;
    page.setRotation(degrees((((current + delta) % 360) + 360) % 360));
  }
  return doc.save();
}

/** Rotate every page by the same clockwise delta (multiple of 90). */
export async function rotateAll(input: PdfInput, delta: number): Promise<Uint8Array> {
  const doc = await loadDocument(input);
  const rotations = new Map<number, number>();
  for (let p = 1; p <= doc.getPageCount(); p++) rotations.set(p, delta);
  return rotatePages(input, rotations);
}

export type PageNumberPosition =
  | 'bottom-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'top-left'
  | 'top-right';

export interface PageNumberOptions {
  /** Where the number sits on the page. Default 'bottom-center'. */
  position?: PageNumberPosition;
  /** 'n' → "4" · 'n-of-total' → "4 / 12" · 'page-n-of-total' → "Page 4 of 12". */
  format?: 'n' | 'n-of-total' | 'page-n-of-total';
  /** Number printed on the first stamped page. Default 1. */
  startAt?: number;
  /** Font size in points. Default 11. */
  fontSize?: number;
  /** Distance from the page edge in points. Default 28 (~1 cm). */
  margin?: number;
  /** 1-based first/last page to stamp (inclusive). Defaults to the whole document. */
  fromPage?: number;
  toPage?: number;
}

/** Stamp page numbers onto a PDF. Returns the numbered document. */
export async function addPageNumbers(
  input: PdfInput,
  options: PageNumberOptions = {},
): Promise<Uint8Array> {
  const {
    position = 'bottom-center',
    format = 'n',
    startAt = 1,
    fontSize = 11,
    margin = 28,
  } = options;

  const doc = await loadDocument(input);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const total = doc.getPageCount();
  const from = Math.max(1, options.fromPage ?? 1);
  const to = Math.min(total, options.toPage ?? total);
  if (from > to) throw new Error(`Page range ${from}-${to} is empty.`);

  const stamped = to - from + 1;
  for (let p = from; p <= to; p++) {
    const n = startAt + (p - from);
    const last = startAt + stamped - 1;
    const label =
      format === 'page-n-of-total' ? `Page ${n} of ${last}` : format === 'n-of-total' ? `${n} / ${last}` : `${n}`;

    const page = doc.getPage(p - 1);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    const x = position.endsWith('left')
      ? margin
      : position.endsWith('right')
        ? width - margin - textWidth
        : (width - textWidth) / 2;
    const y = position.startsWith('top') ? height - margin - fontSize : margin;

    page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.25, 0.25, 0.25) });
  }
  return doc.save();
}

export interface WatermarkOptions {
  /** Font size in points. Default: auto-fitted to ~70% of the page diagonal. */
  fontSize?: number;
  /** 0 (invisible) … 1 (opaque). Default 0.18. */
  opacity?: number;
  /** Counter-clockwise angle in degrees. Default 45 (diagonal). */
  angle?: number;
  /** Text colour as 0-1 RGB. Default mid grey. */
  color?: { r: number; g: number; b: number };
  /** 1-based first/last page to stamp (inclusive). Defaults to the whole document. */
  fromPage?: number;
  toPage?: number;
}

/** Stamp a semi-transparent text watermark across each page's centre. */
export async function addWatermark(
  input: PdfInput,
  text: string,
  options: WatermarkOptions = {},
): Promise<Uint8Array> {
  if (!text.trim()) throw new Error('Watermark text is empty.');
  const { opacity = 0.18, angle = 45, color = { r: 0.45, g: 0.45, b: 0.45 } } = options;

  const doc = await loadDocument(input);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const total = doc.getPageCount();
  const from = Math.max(1, options.fromPage ?? 1);
  const to = Math.min(total, options.toPage ?? total);
  if (from > to) throw new Error(`Page range ${from}-${to} is empty.`);

  for (let p = from; p <= to; p++) {
    const page = doc.getPage(p - 1);
    const { width, height } = page.getSize();

    // Auto-fit: scale so the text spans ~70% of the page diagonal (clamped),
    // unless an explicit size is given. Width at size S = widthAt100 * S / 100.
    const diagonal = Math.hypot(width, height);
    const widthAt100 = font.widthOfTextAtSize(text, 100);
    const fitted =
      options.fontSize ?? Math.min(160, Math.max(12, ((diagonal * 0.7) / widthAt100) * 100));

    const textWidth = font.widthOfTextAtSize(text, fitted);
    const rad = (angle * Math.PI) / 180;
    // Offset the start point so the rotated baseline passes through the centre.
    const x = width / 2 - (textWidth / 2) * Math.cos(rad);
    const y = height / 2 - (textWidth / 2) * Math.sin(rad);

    page.drawText(text, {
      x,
      y,
      size: fitted,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(angle),
    });
  }
  return doc.save();
}

export interface CropMargins {
  /** Fraction of the page dimension to trim from each side, 0 … 0.45. */
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Crop pages by trimming a fraction off each side (sets the CropBox; the full
 * content remains recoverable in the MediaBox). Margins are fractions of the
 * page's width/height so one setting works across mixed page sizes.
 */
export async function cropPages(
  input: PdfInput,
  margins: CropMargins,
  options: { fromPage?: number; toPage?: number } = {},
): Promise<Uint8Array> {
  for (const [side, v] of Object.entries(margins)) {
    if (v < 0 || v > 0.45) throw new Error(`Crop ${side} must be between 0 and 0.45; got ${v}.`);
  }
  if (margins.left + margins.right >= 0.9 || margins.top + margins.bottom >= 0.9) {
    throw new Error('Crop margins leave no page area.');
  }

  const doc = await loadDocument(input);
  const total = doc.getPageCount();
  const from = Math.max(1, options.fromPage ?? 1);
  const to = Math.min(total, options.toPage ?? total);
  if (from > to) throw new Error(`Page range ${from}-${to} is empty.`);

  for (let p = from; p <= to; p++) {
    const page = doc.getPage(p - 1);
    const { x, y, width, height } = page.getMediaBox();
    page.setCropBox(
      x + width * margins.left,
      y + height * margins.bottom,
      width * (1 - margins.left - margins.right),
      height * (1 - margins.top - margins.bottom),
    );
  }
  return doc.save();
}
