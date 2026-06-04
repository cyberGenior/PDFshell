import { PDFDocument } from 'pdf-lib';

/** A raster image to place on its own page. pdf-lib embeds JPEG and PNG natively. */
export interface ImageInput {
  bytes: Uint8Array;
  format: 'jpg' | 'png';
}

export interface ImagesToPdfOptions {
  /**
   * Pixels-per-inch used to translate image pixels into PDF points. 96 is the
   * web/CSS default, so a screenshot comes out at roughly its on-screen size.
   */
  dpi?: number;
}

/**
 * Build a PDF with one image per page, each page sized to its image.
 *
 * Browser callers normalise any decodable image to PNG/JPEG bytes via a canvas
 * before calling this, so this stays pure (no DOM) and testable in Node.
 */
export async function imagesToPdf(
  images: ImageInput[],
  options: ImagesToPdfOptions = {},
): Promise<Uint8Array> {
  if (images.length === 0) throw new Error('imagesToPdf requires at least one image.');

  const dpi = options.dpi ?? 96;
  const pxToPt = 72 / dpi;
  const doc = await PDFDocument.create();

  for (const { bytes, format } of images) {
    const img = format === 'jpg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
    const widthPt = img.width * pxToPt;
    const heightPt = img.height * pxToPt;
    const page = doc.addPage([widthPt, heightPt]);
    page.drawImage(img, { x: 0, y: 0, width: widthPt, height: heightPt });
  }

  return doc.save();
}
