import type { Metadata } from 'next';

export const SITE_NAME = 'PDFShell';
// `||` (not `??`): the Docker build passes an EMPTY string when unset, which
// `??` would keep — then `new URL('')` in metadataBase throws and the build dies.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pdfshell.onrender.com').replace(/\/$/, '');
export const SITE_DESCRIPTION =
  'Merge, split, compress, edit, OCR and convert PDFs — free and private, right in your browser. Open-source, no sign-up, no watermark; your files never leave your device.';

interface Seo {
  title: string;
  description: string;
}

/** Per-route titles/descriptions — the single biggest on-page SEO lever. */
export const PAGES: Record<string, Seo> = {
  '/merge': {
    title: 'Merge & Organize PDF',
    description: 'Combine PDFs and drag pages into any order — free, in your browser, nothing uploaded. No watermark, no sign-up.',
  },
  '/split': {
    title: 'Split PDF — Extract Pages',
    description: 'Split a PDF or extract page ranges into separate files. Free, private, fully in-browser.',
  },
  '/compress': {
    title: 'Compress PDF — Reduce File Size',
    description: 'Shrink PDF file size with lossless re-optimisation or scan flattening. Free and private, in your browser.',
  },
  '/edit': {
    title: 'Edit PDF Online',
    description: 'Edit existing text in place and add text anywhere on a PDF, matching the document’s own fonts. Free in-browser PDF editor.',
  },
  '/scan': {
    title: 'Scan to PDF — Photo to PDF Scanner',
    description: 'Turn phone photos of documents into a clean, scanner-style PDF — auto contrast, rotate and reorder. Free, private, in your browser.',
  },
  '/flows': {
    title: 'One-Click PDF Workflows',
    description: 'Run common multi-step PDF tasks in one guided flow — scan & clean up, scan to searchable text, combine & compress. Free and private.',
  },
  '/ocr': {
    title: 'OCR PDF — Scanned PDF to Text',
    description: 'Extract text from scanned PDFs in 100+ languages, entirely in your browser. Free, private OCR — no upload.',
  },
  '/convert': {
    title: 'Convert PDF',
    description: 'Convert PDF to Word, Excel, PowerPoint, text and images — and Office or images back to PDF.',
  },
  '/convert/pdf-to-word': {
    title: 'PDF to Word (DOCX) Converter',
    description: 'Convert PDF to an editable Word document with the layout preserved. High-fidelity and free.',
  },
  '/convert/pdf-to-excel': {
    title: 'PDF to Excel (XLSX) Converter',
    description: 'Convert PDF tables and reports into a styled, formula-ready Excel spreadsheet.',
  },
  '/convert/pdf-to-powerpoint': {
    title: 'PDF to PowerPoint (PPTX) Converter',
    description: 'Turn a PDF into an editable, presentation-ready PowerPoint deck.',
  },
  '/convert/pdf-to-text': {
    title: 'PDF to Text Converter',
    description: 'Extract clean plain text from any PDF in your browser. Free and private.',
  },
  '/convert/pdf-to-images': {
    title: 'PDF to Images (JPG / PNG)',
    description: 'Export every PDF page as a high-quality image, in your browser — nothing uploaded.',
  },
  '/convert/docx-to-pdf': {
    title: 'Word to PDF Converter',
    description: 'Convert Word and Office documents to PDF with high fidelity.',
  },
  '/convert/images-to-pdf': {
    title: 'Images to PDF Converter',
    description: 'Combine JPG and PNG images into a single PDF, right in your browser.',
  },
  '/rotate': {
    title: 'Rotate PDF Pages',
    description: 'Rotate PDF pages 90°, 180° or 270° — single pages or the whole file, free and private, in your browser.',
  },
  '/page-numbers': {
    title: 'Add Page Numbers to PDF',
    description: 'Stamp page numbers on a PDF — choose position, format and start number. Free, in your browser, nothing uploaded.',
  },
  '/watermark': {
    title: 'Add Watermark to PDF',
    description: 'Stamp a text watermark like DRAFT or CONFIDENTIAL across PDF pages. Free, private, fully in-browser.',
  },
  '/crop': {
    title: 'Crop PDF Pages',
    description: 'Trim margins from PDF pages with a live preview — free and private, processed on your device.',
  },
  '/protect': {
    title: 'Protect PDF with Password — or Unlock',
    description: 'Add AES-256 password protection to a PDF, or remove a password you know. Free, no watermark.',
  },
  '/about': {
    title: 'About PDFShell',
    description: 'PDFShell is a free, open-source, privacy-first PDF toolkit that runs entirely in your browser — built for low-bandwidth connections.',
  },
  '/privacy': {
    title: 'Privacy Policy',
    description: 'How PDFShell handles your data: files are processed on your device and never uploaded. What analytics and advertising cookies are used, and how to opt out.',
  },
};

/**
 * Stable sitemap <lastmod> dates. Google distrusts a lastmod that changes on
 * every fetch (the old `new Date()`), so these are fixed and only bumped when a
 * route's CONTENT actually changes. `CONTENT_REVISED` is the default; override a
 * specific route in `ROUTE_UPDATED` when only that page changed.
 */
export const CONTENT_REVISED = '2026-06-12';
export const ROUTE_UPDATED: Record<string, string> = {
  '/scan': '2026-06-11',
  '/flows': '2026-06-11',
};

/** The <lastmod> date (YYYY-MM-DD) for a tool/convert route. */
export function routeLastModified(path: string): string {
  return ROUTE_UPDATED[path] ?? CONTENT_REVISED;
}

/** Build per-page Metadata (title, description, canonical, OG/Twitter) for a route. */
export function pageMeta(path: string): Metadata {
  const p = PAGES[path];
  if (!p) return {};
  const fullTitle = `${p.title} — ${SITE_NAME}`;
  return {
    // Absolute so the brand suffix is consistent regardless of nested layouts.
    title: { absolute: fullTitle },
    description: p.description,
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description: p.description, url: path, siteName: SITE_NAME, type: 'website' },
    twitter: { card: 'summary_large_image', title: fullTitle, description: p.description },
  };
}
