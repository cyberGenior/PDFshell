import { PDFDocument } from 'pdf-lib';
import type { PdfInput } from './types.js';
import { loadDocument } from './internal.js';

/** A PNG image stamped onto a page (used for signatures and the like). */
export interface ImageStamp {
  /** PNG bytes to embed. */
  png: Uint8Array;
  /** 0-based page index to stamp on. */
  pageIndex: number;
  /** Left edge, in PDF points measured from the page's left. */
  x: number;
  /** Top edge, in PDF points measured from the page's TOP (screen-style). */
  top: number;
  /** Drawn width in PDF points. */
  width: number;
  /** Drawn height in PDF points. */
  height: number;
}

/**
 * Draw PNG images onto an existing PDF — entirely in memory. Coordinates use a
 * screen-style origin (top-left, y grows downward) so callers can pass the same
 * numbers they use to position an overlay; the conversion to pdf-lib's
 * bottom-left origin happens here.
 */
export async function stampImages(pdf: PdfInput, stamps: ImageStamp[]): Promise<Uint8Array> {
  const doc = await loadDocument(pdf);
  // Embed each distinct PNG once, then reuse.
  const embedded = new Map<Uint8Array, Awaited<ReturnType<PDFDocument['embedPng']>>>();

  for (const stamp of stamps) {
    const page = doc.getPage(stamp.pageIndex);
    if (!page) throw new Error(`No page at index ${stamp.pageIndex}.`);
    let img = embedded.get(stamp.png);
    if (!img) {
      img = await doc.embedPng(stamp.png);
      embedded.set(stamp.png, img);
    }
    const { height: pageHeight } = page.getSize();
    page.drawImage(img, {
      x: stamp.x,
      y: pageHeight - stamp.top - stamp.height,
      width: stamp.width,
      height: stamp.height,
    });
  }

  return doc.save();
}
