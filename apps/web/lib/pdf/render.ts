/**
 * Thin wrapper around PDF.js for in-browser rendering. Everything here is
 * dynamically imported so the (sizeable) PDF.js bundle + worker only load when a
 * tool actually needs to render — never on first paint. Keeps the landing page
 * and the pure pdf-lib tools (Merge/Split) cheap on slow connections.
 */
import type { PDFDocumentProxy } from 'pdfjs-dist';

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      // Webpack emits the worker as an asset and gives us its URL. This is the
      // file the service worker (public/sw.js) caches for offline reuse.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/** Load a PDF into a PDF.js document. Caller must call `.destroy()` when done. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  // PDF.js can detach the buffer; hand it a copy so the caller's bytes survive.
  return pdfjs.getDocument({ data: bytes.slice() }).promise;
}

/** Render one page (1-based) onto a fresh canvas at the given scale. */
export async function renderPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context.');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas → JPEG failed.'));
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)), reject);
      },
      'image/jpeg',
      quality,
    );
  });
}

export interface RenderedImagePage {
  jpeg: Uint8Array;
  widthPt: number;
  heightPt: number;
}

/**
 * Rasterise every page to a JPEG at a target DPI — the input to the Compress
 * "flatten" path (compress-engine `assembleImagePdf`).
 *
 * PDF.js renders at 72 dpi when scale = 1, so scale = dpi / 72. The PDF page box
 * stays the same physical size (widthPt/heightPt), only the raster resolution
 * changes — that's where the size saving comes from.
 */
export async function renderPdfToImagePages(
  bytes: Uint8Array,
  dpi: number,
  jpegQuality: number,
  onProgress?: (done: number, total: number) => void,
): Promise<RenderedImagePage[]> {
  const pdf = await loadPdf(bytes);
  try {
    const scale = dpi / 72;
    const pages: RenderedImagePage[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const unscaled = page.getViewport({ scale: 1 });
      const canvas = await renderPageToCanvas(pdf, i, scale);
      pages.push({
        jpeg: await canvasToJpeg(canvas, jpegQuality),
        widthPt: unscaled.width,
        heightPt: unscaled.height,
      });
      onProgress?.(i, pdf.numPages);
    }
    return pages;
  } finally {
    await pdf.destroy();
  }
}

export interface RenderedImageFile {
  name: string;
  bytes: Uint8Array;
}

/**
 * Render every page to a full image file (PNG or JPG) at a given DPI — the
 * PDF→Images export. Returns one entry per page, named page-001.png, etc.
 */
export async function renderPdfToImageFiles(
  bytes: Uint8Array,
  format: 'png' | 'jpg',
  dpi: number,
  onProgress?: (done: number, total: number) => void,
): Promise<RenderedImageFile[]> {
  const pdf = await loadPdf(bytes);
  try {
    const scale = dpi / 72;
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const ext = format === 'png' ? 'png' : 'jpg';
    const pad = String(pdf.numPages).length;
    const files: RenderedImageFile[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const canvas = await renderPageToCanvas(pdf, i, scale);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, mime, format === 'jpg' ? 0.85 : undefined),
      );
      if (!blob) throw new Error(`Failed to encode page ${i}.`);
      files.push({
        name: `page-${String(i).padStart(pad, '0')}.${ext}`,
        bytes: new Uint8Array(await blob.arrayBuffer()),
      });
      onProgress?.(i, pdf.numPages);
    }
    return files;
  } finally {
    await pdf.destroy();
  }
}

/** Render a thumbnail data URL for a given page — used by the preview strip. */
export async function renderThumbnail(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  maxWidthPx = 160,
): Promise<string> {
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = maxWidthPx / base.width;
  const canvas = await renderPageToCanvas(pdf, pageNumber, scale);
  return canvas.toDataURL('image/png');
}
