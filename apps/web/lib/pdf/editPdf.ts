import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export type FontFamily = 'sans' | 'serif' | 'mono';

export interface TextBox {
  id: string;
  page: number; // 1-based
  /** Top-left position, in PDF points (top-down origin, like the screen). */
  xPt: number;
  yPt: number;
  text: string;
  sizePt: number;
  /** #rrggbb */
  color: string;
  family: FontFamily;
  bold: boolean;
  /**
   * For an EDITED existing text run: the size of the original region to cover
   * (paint over) before drawing the new text. Omitted for newly-added text.
   */
  cover?: { wPt: number; hPt: number };
}

function standardFont(family: FontFamily, bold: boolean): StandardFonts {
  if (family === 'serif') return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  if (family === 'mono') return bold ? StandardFonts.CourierBold : StandardFonts.Courier;
  return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
}

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1]!, 16) / 255, g: parseInt(m[2]!, 16) / 255, b: parseInt(m[3]!, 16) / 255 };
}

/**
 * Apply the user's text edits to the PDF and return the new bytes.
 *
 * - Newly-added text is drawn at its position.
 * - Edited existing text first has its original region painted over with a white
 *   box (so the old glyphs disappear), then the new text is drawn on top. This
 *   is seamless on white backgrounds; over a coloured fill the cover box shows —
 *   an accepted trade-off for in-place editing without re-typesetting the page.
 *
 * Coordinates use a top-down origin (matching the on-screen overlay); PDF's
 * origin is bottom-left, so we flip Y.
 */
export async function savePdfWithText(input: Uint8Array, boxes: TextBox[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(input);
  const pages = doc.getPages();
  const cache = new Map<string, PDFFont>();
  const white = rgb(1, 1, 1);

  async function font(family: FontFamily, bold: boolean): Promise<PDFFont> {
    const key = `${family}-${bold}`;
    let f = cache.get(key);
    if (!f) {
      f = await doc.embedFont(standardFont(family, bold));
      cache.set(key, f);
    }
    return f;
  }

  for (const b of boxes) {
    const page = pages[b.page - 1];
    if (!page) continue;
    const { height } = page.getSize();

    // Cover the original glyphs for an edited run (even if the new text is empty
    // → a deletion).
    if (b.cover) {
      page.drawRectangle({
        x: b.xPt - 1,
        y: height - b.yPt - b.cover.hPt,
        width: b.cover.wPt + 2,
        height: b.cover.hPt + 2,
        color: white,
      });
    }

    if (!b.text.trim()) continue;
    const f = await font(b.family, b.bold);
    const c = hexToRgb(b.color);
    const y = height - b.yPt - b.sizePt; // baseline ≈ box top + ascent
    try {
      page.drawText(b.text, { x: b.xPt, y, size: b.sizePt, font: f, color: rgb(c.r, c.g, c.b) });
    } catch {
      /* StandardFonts (WinAnsi) can't encode every glyph — skip this run */
    }
  }

  return doc.save();
}
