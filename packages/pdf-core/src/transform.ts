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

/** Font family for stamped text — maps to the matching PDF base-14 standard font. */
export type StampFontFamily = 'sans' | 'serif' | 'mono';

/** Resolve a family + weight to a pdf-lib standard font (always available). */
function standardFontFor(family: StampFontFamily, bold: boolean): StandardFonts {
  if (family === 'serif') return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  if (family === 'mono') return bold ? StandardFonts.CourierBold : StandardFonts.Courier;
  return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
}

export interface PageNumberOptions {
  /** Where the number sits on the page. Default 'bottom-center'. */
  position?: PageNumberPosition;
  /** 'n' → "4" · 'n-of-total' → "4 / 12" · 'page-n-of-total' → "Page 4 of 12". */
  format?: 'n' | 'n-of-total' | 'page-n-of-total';
  /** Number printed on the first stamped page. Default 1. */
  startAt?: number;
  /** Font size in points. Default 11. */
  fontSize?: number;
  /** Font family. Default 'sans'. */
  font?: StampFontFamily;
  /** Bold weight. Default false. */
  bold?: boolean;
  /** Text colour as 0-1 RGB. Default dark grey. */
  color?: { r: number; g: number; b: number };
  /** Text placed before the number, e.g. "[ ". Default empty. */
  prefix?: string;
  /** Text placed after the number, e.g. " ]". Default empty. */
  suffix?: string;
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
    font: family = 'sans',
    bold = false,
    color = { r: 0.25, g: 0.25, b: 0.25 },
    prefix = '',
    suffix = '',
    margin = 28,
  } = options;

  const doc = await loadDocument(input);
  const font = await doc.embedFont(standardFontFor(family, bold));
  const total = doc.getPageCount();
  const from = Math.max(1, options.fromPage ?? 1);
  const to = Math.min(total, options.toPage ?? total);
  if (from > to) throw new Error(`Page range ${from}-${to} is empty.`);

  const stamped = to - from + 1;
  for (let p = from; p <= to; p++) {
    const n = startAt + (p - from);
    const last = startAt + stamped - 1;
    const core =
      format === 'page-n-of-total' ? `Page ${n} of ${last}` : format === 'n-of-total' ? `${n} / ${last}` : `${n}`;
    const label = `${prefix}${core}${suffix}`;

    const page = doc.getPage(p - 1);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    const x = position.endsWith('left')
      ? margin
      : position.endsWith('right')
        ? width - margin - textWidth
        : (width - textWidth) / 2;
    const y = position.startsWith('top') ? height - margin - fontSize : margin;

    page.drawText(label, { x, y, size: fontSize, font, color: rgb(color.r, color.g, color.b) });
  }
  return doc.save();
}

/** Nine anchor points for a watermark (axis-aligned box placement). */
export type WatermarkPosition =
  | 'center'
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

/** Bottom-left x/y so a w×h box sits at `position` with the given edge margin. */
function anchorBox(
  position: WatermarkPosition,
  pageW: number,
  pageH: number,
  w: number,
  h: number,
  margin: number,
): { x: number; y: number } {
  const x = position.endsWith('left')
    ? margin
    : position.endsWith('right')
      ? pageW - margin - w
      : (pageW - w) / 2;
  const y = position.startsWith('top')
    ? pageH - margin - h
    : position.startsWith('bottom')
      ? margin
      : (pageH - h) / 2;
  return { x, y };
}

export interface WatermarkOptions {
  /** Font size in points. Default: auto-fitted (large for centre, smaller else). */
  fontSize?: number;
  /** 0 (invisible) … 1 (opaque). Default 0.18. */
  opacity?: number;
  /** Counter-clockwise angle in degrees. Default 45 (diagonal). */
  angle?: number;
  /** Text colour as 0-1 RGB. Default mid grey. */
  color?: { r: number; g: number; b: number };
  /** Font family. Default 'sans'. */
  font?: StampFontFamily;
  /** Anchor point. Default 'center'. Ignored when `tile` is true. */
  position?: WatermarkPosition;
  /** Repeat the watermark in a grid across the whole page. Default false. */
  tile?: boolean;
  /** 1-based first/last page to stamp (inclusive). Defaults to the whole document. */
  fromPage?: number;
  toPage?: number;
}

/** Stamp a semi-transparent text watermark — centred, positioned, or tiled. */
export async function addWatermark(
  input: PdfInput,
  text: string,
  options: WatermarkOptions = {},
): Promise<Uint8Array> {
  if (!text.trim()) throw new Error('Watermark text is empty.');
  const {
    opacity = 0.18,
    angle = 45,
    color = { r: 0.45, g: 0.45, b: 0.45 },
    font: family = 'sans',
    position = 'center',
    tile = false,
  } = options;

  const doc = await loadDocument(input);
  const font = await doc.embedFont(standardFontFor(family, true));
  const total = doc.getPageCount();
  const from = Math.max(1, options.fromPage ?? 1);
  const to = Math.min(total, options.toPage ?? total);
  if (from > to) throw new Error(`Page range ${from}-${to} is empty.`);
  const col = rgb(color.r, color.g, color.b);

  for (let p = from; p <= to; p++) {
    const page = doc.getPage(p - 1);
    const { width, height } = page.getSize();
    const widthAt100 = font.widthOfTextAtSize(text, 100);

    if (tile) {
      // A repeating diagonal mosaic. Modest size so many tiles fit.
      const size = options.fontSize ?? Math.max(12, Math.min(48, width * 0.08));
      const tw = font.widthOfTextAtSize(text, size);
      const stepX = tw + size * 2;
      const stepY = size * 4;
      for (let yy = 0; yy < height + stepY; yy += stepY) {
        for (let xx = -tw; xx < width + stepX; xx += stepX) {
          page.drawText(text, { x: xx, y: yy, size, font, color: col, opacity, rotate: degrees(angle) });
        }
      }
      continue;
    }

    if (position === 'center') {
      // Auto-fit so the text spans ~70% of the page diagonal (clamped).
      const diagonal = Math.hypot(width, height);
      const fitted = options.fontSize ?? Math.min(160, Math.max(12, ((diagonal * 0.7) / widthAt100) * 100));
      const textWidth = font.widthOfTextAtSize(text, fitted);
      const rad = (angle * Math.PI) / 180;
      const x = width / 2 - (textWidth / 2) * Math.cos(rad);
      const y = height / 2 - (textWidth / 2) * Math.sin(rad);
      page.drawText(text, { x, y, size: fitted, font, color: col, opacity, rotate: degrees(angle) });
      continue;
    }

    // Corner / edge: a smaller mark anchored with a margin (~40% of page width).
    const fitted = options.fontSize ?? Math.min(72, Math.max(10, ((width * 0.4) / widthAt100) * 100));
    const tw = font.widthOfTextAtSize(text, fitted);
    const { x, y } = anchorBox(position, width, height, tw, fitted, 28);
    page.drawText(text, { x, y, size: fitted, font, color: col, opacity });
  }
  return doc.save();
}

export interface ImageWatermarkOptions {
  /** 0 (invisible) … 1 (opaque). Default 0.2. */
  opacity?: number;
  /** Drawn width as a fraction of the page width, 0.02–1. Default 0.3. */
  scale?: number;
  /** Anchor point. Default 'center'. Ignored when `tile` is true. */
  position?: WatermarkPosition;
  /** Repeat the image in a grid across the whole page. Default false. */
  tile?: boolean;
  /** 1-based first/last page to stamp (inclusive). Defaults to the whole document. */
  fromPage?: number;
  toPage?: number;
}

/** Stamp a semi-transparent PNG (logo/stamp) watermark — positioned or tiled. */
export async function addImageWatermark(
  input: PdfInput,
  png: Uint8Array,
  options: ImageWatermarkOptions = {},
): Promise<Uint8Array> {
  const { opacity = 0.2, scale = 0.3, position = 'center', tile = false } = options;
  const clampScale = Math.min(1, Math.max(0.02, scale));

  const doc = await loadDocument(input);
  const img = await doc.embedPng(png);
  const aspect = img.width / img.height;
  const total = doc.getPageCount();
  const from = Math.max(1, options.fromPage ?? 1);
  const to = Math.min(total, options.toPage ?? total);
  if (from > to) throw new Error(`Page range ${from}-${to} is empty.`);

  for (let p = from; p <= to; p++) {
    const page = doc.getPage(p - 1);
    const { width, height } = page.getSize();
    const w = width * clampScale;
    const h = w / aspect;

    if (tile) {
      const stepX = w * 1.5;
      const stepY = h * 1.5;
      for (let yy = 0; yy < height + stepY; yy += stepY) {
        for (let xx = 0; xx < width + stepX; xx += stepX) {
          page.drawImage(img, { x: xx, y: yy, width: w, height: h, opacity });
        }
      }
      continue;
    }

    const { x, y } = anchorBox(position, width, height, w, h, 28);
    page.drawImage(img, { x, y, width: w, height: h, opacity });
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
