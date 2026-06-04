import { PDFDocument, StandardFonts } from 'pdf-lib';
import type { OcrWord } from '@pdfshell/ocr-engine';

export interface SearchablePage {
  /** JPEG bytes of the rendered page image. */
  jpeg: Uint8Array;
  /** Pixel dimensions of that image (the OCR coordinate space). */
  pxWidth: number;
  pxHeight: number;
  words: OcrWord[];
}

/**
 * Build a "searchable PDF": each page is the original page image with an
 * INVISIBLE text layer laid over it at the OCR word positions. The result looks
 * identical to the scan but is fully selectable and searchable — the single most
 * valuable OCR output, produced entirely on-device.
 *
 * @param pointsPerPixel  72 / renderDpi (e.g. 0.5 for a 144-dpi render), used to
 *                        map image pixels back to PDF points (original size).
 */
export async function buildSearchablePdf(
  pages: SearchablePage[],
  pointsPerPixel: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const pg of pages) {
    const wPt = pg.pxWidth * pointsPerPixel;
    const hPt = pg.pxHeight * pointsPerPixel;
    const page = doc.addPage([wPt, hPt]);
    const img = await doc.embedJpg(pg.jpeg);
    page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt });

    for (const w of pg.words) {
      const text = w.text.trim();
      if (!text) continue;
      const x = w.bbox.x0 * pointsPerPixel;
      const boxH = (w.bbox.y1 - w.bbox.y0) * pointsPerPixel;
      // PDF origin is bottom-left; OCR origin is top-left → flip Y.
      const y = hPt - w.bbox.y1 * pointsPerPixel;
      const size = Math.max(1, boxH * 0.8);
      try {
        // opacity 0 → invisible but present in the content stream (selectable).
        page.drawText(text, { x, y, size, font, opacity: 0 });
      } catch {
        // Helvetica (WinAnsi) can't encode some scripts (Arabic, CJK). Skip those
        // words rather than fail — the page image still carries them visually.
      }
    }
  }

  return doc.save();
}
