import { CONVERT_BASE } from '@/lib/libreoffice';

export type FontFamily = 'sans' | 'serif' | 'mono';

/** A line of text on a page, with its real style (from MuPDF). */
export interface EditLine {
  text: string;
  bbox: [number, number, number, number]; // PDF points: x0,y0,x1,y1 (top-down)
  origin: [number, number]; // baseline origin (PDF points)
  size: number;
  color: string; // #rrggbb
  bold: boolean;
  italic: boolean;
  family: FontFamily;
  font?: string | null; // embedded-font id → reuse the exact font on save
  bg?: string; // sampled background colour behind the line (#rrggbb) for cover-on-edit
  ocr?: boolean; // line came from OCR (scanned page) → cover-on-save, not redact
}

export interface ExtractedPage {
  pageCount: number;
  width: number; // points
  height: number;
  image: string; // base64 PNG — the ORIGINAL page (text included), the editor canvas
  lines: EditLine[];
  scanned: boolean; // true → OCR'd raster page
}

/** A single line of the lifted text layer to re-draw on save. */
export interface OutLine {
  text: string;
  origin: [number, number];
  bbox: [number, number, number, number];
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  family: FontFamily;
  font?: string | null; // embedded-font id → reuse the exact font on save
  bg?: string; // background behind the line (for covering scanned text on save)
}

/** Full lifted text layer for one edited page (all its lines, with edits applied). */
export interface PageEdit {
  page: number; // 0-based
  lines: OutLine[];
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

/** Render a page + extract its editable lines (real font/size/colour). */
export async function extractPage(pdf: Uint8Array, pageIndex: number): Promise<ExtractedPage> {
  const r = await fetch(`${CONVERT_BASE}/edit/page?n=${pageIndex}`, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body: pdf as BodyInit,
  });
  if (!r.ok) throw new Error(`Could not read page (${r.status}).`);
  return r.json();
}

/**
 * Apply only the edited lines with MuPDF: each edited line's original glyphs are
 * removed (redaction, no ghost) or covered (scanned) and redrawn in the exact
 * embedded font. Unedited text is left untouched as original vector text.
 */
export async function applyEdits(pdf: Uint8Array, pages: PageEdit[]): Promise<Uint8Array> {
  const r = await fetch(`${CONVERT_BASE}/edit/apply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pdf: toBase64(pdf), pages }),
  });
  if (!r.ok) throw new Error(`Save failed (${r.status}).`);
  return new Uint8Array(await r.arrayBuffer());
}
