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
};

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
