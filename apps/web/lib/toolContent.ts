/**
 * On-page SEO content for each tool: a short intro, how-to steps, and an FAQ.
 * Rendered by <ToolSeoContent /> below the tool widget and emitted as FAQ
 * structured data. Fixes "thin content" (a bare tool widget rarely ranks).
 *
 * Keyed by route path (same keys as PAGES in lib/seo.ts). The /convert hub is
 * intentionally omitted — its layout wraps the sub-pages, so content there would
 * duplicate onto every sub-page.
 */
export interface ToolContent {
  heading: string;
  intro: string;
  steps: string[];
  faqs: { q: string; a: string }[];
}

const PRIVACY_FAQ = {
  q: 'Is it private — do my files get uploaded?',
  a: 'These tools run entirely in your browser, so your file never leaves your device. Nothing is uploaded to a server, and nothing is stored.',
};
const SERVER_PRIVACY_FAQ = {
  q: 'Where is my file processed?',
  a: 'This conversion runs on the PDFShell server (it needs LibreOffice-class tooling that can’t run in a browser). Your file is processed in memory and deleted right after — it is never shared or kept.',
};
const FREE_FAQ = {
  q: 'Is it really free? Any watermark or sign-up?',
  a: 'Yes — PDFShell is free and open-source. No account, no watermark, no page limits.',
};

export const TOOL_CONTENT: Record<string, ToolContent> = {
  '/merge': {
    heading: 'Merge and organize PDF files online',
    intro:
      'Combine several PDFs into one document and drag pages into any order — free, and right in your browser so nothing is uploaded. Reorder, remove and rearrange pages, then download a single clean PDF.',
    steps: [
      'Drop in one or more PDF files.',
      'Drag the page thumbnails to reorder them, or remove the ones you don’t need.',
      'Click download to save the merged PDF — no upload, no watermark.',
    ],
    faqs: [
      { q: 'How do I merge PDFs without uploading them?', a: 'PDFShell merges PDFs on your device in the browser, so the files are never uploaded. Just drop them in, arrange the pages and download.' },
      { q: 'Can I reorder or delete pages while merging?', a: 'Yes — drag the page thumbnails into any order and remove any page before downloading.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/split': {
    heading: 'Split a PDF or extract pages',
    intro:
      'Split a PDF into separate files or pull out specific pages and page ranges — in your browser, with nothing uploaded. Great for extracting a chapter, a single form, or splitting a scan into parts.',
    steps: [
      'Drop in the PDF you want to split.',
      'Choose the pages or ranges to extract (e.g. 1–3, 5, 8–10).',
      'Download the extracted pages as a new PDF.',
    ],
    faqs: [
      { q: 'How do I extract specific pages from a PDF?', a: 'Open the PDF in the Split tool, type the pages or ranges you want, and download them as a new file.' },
      { q: 'Can I split one PDF into multiple files?', a: 'Yes — define each range and export them as separate PDFs.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/compress': {
    heading: 'Compress PDF to reduce file size',
    intro:
      'Shrink a PDF so it’s easy to email or upload. PDFShell does a lossless re-optimise in your browser, and offers stronger image-flattening compression for scan-heavy files.',
    steps: [
      'Drop in the PDF you want to shrink.',
      'Pick lossless (keeps text sharp) or a stronger preset for scanned/image PDFs.',
      'Download the smaller file — PDFShell never returns a larger file than the original.',
    ],
    faqs: [
      { q: 'How can I reduce PDF file size for free?', a: 'Use the Compress tool: lossless mode re-optimises the file structure in your browser, while the stronger presets downsample images in scan-heavy PDFs.' },
      { q: 'Will compressing blur my text?', a: 'No — lossless mode keeps text and vectors crisp. Only the stronger image presets re-encode embedded images.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/edit': {
    heading: 'Edit PDF text online, free',
    intro:
      'Edit the existing text in a PDF and add new text anywhere on the page, matching the document’s own fonts. PDFShell lifts the page so your edits sit cleanly in place — no ghosted original text behind them.',
    steps: [
      'Open your PDF in the editor.',
      'Click any line to edit it in place, or click an empty area to add new text.',
      'Download your edited PDF — only the lines you changed are rewritten.',
    ],
    faqs: [
      { q: 'Can I edit existing text in a PDF, not just add a text box?', a: 'Yes — click a line and retype it. PDFShell reuses the document’s embedded font and removes the original glyphs so there’s no overlap.' },
      { q: 'Can I edit a scanned PDF?', a: 'Yes — scanned pages are read with on-device OCR so you can edit the recognised text, then the edited word is redrawn over the scan.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/ocr': {
    heading: 'OCR a scanned PDF to searchable text',
    intro:
      'Turn a scanned PDF or image into selectable, searchable text with OCR that runs entirely in your browser — in 100+ languages, with nothing uploaded.',
    steps: [
      'Drop in a scanned PDF or image.',
      'Pick the language(s) and run OCR — it processes on your device.',
      'Copy the recognised text or download a searchable PDF.',
    ],
    faqs: [
      { q: 'How do I extract text from a scanned PDF for free?', a: 'Open it in the OCR tool — Tesseract runs in your browser, recognises the text on your device, and lets you copy it or save a searchable PDF.' },
      { q: 'Which languages are supported?', a: 'Over 100 languages via Tesseract, including many used across Africa.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/convert/pdf-to-word': {
    heading: 'Convert PDF to Word (DOCX)',
    intro:
      'Turn a PDF into an editable Microsoft Word document with the layout, headings and tables preserved — so you can keep working on it in Word or Google Docs.',
    steps: ['Drop in your PDF.', 'Click convert to DOCX.', 'Open the downloaded Word file and edit away.'],
    faqs: [
      { q: 'Does the Word file keep the original layout?', a: 'Yes — PDFShell reconstructs paragraphs, headings and tables so the DOCX closely matches the PDF.' },
      { q: 'Can I edit the result in Google Docs?', a: 'Yes — the .docx opens in Word, Google Docs, or LibreOffice.' },
      SERVER_PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/convert/pdf-to-excel': {
    heading: 'Convert PDF to Excel (XLSX)',
    intro:
      'Extract tables and reports from a PDF into a styled, formula-ready Excel spreadsheet — numbers stay real numbers, not pictures, so you can sort, sum and chart them.',
    steps: ['Drop in your PDF.', 'Click convert to XLSX.', 'Open the spreadsheet — sections, tables and numbers are preserved.'],
    faqs: [
      { q: 'Will the numbers be editable in Excel?', a: 'Yes — PDFShell writes real numeric cells (with %/decimal formats), so the sheet is computable, not just a visual copy.' },
      { q: 'Does it handle multi-section reports and tables?', a: 'Yes — section headers, layout and ruled tables are reconstructed into the sheet.' },
      SERVER_PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/convert/pdf-to-powerpoint': {
    heading: 'Convert PDF to PowerPoint (PPTX)',
    intro:
      'Turn a PDF into an editable, presentation-ready PowerPoint deck — one slide per page, in landscape, ready to present or refine.',
    steps: ['Drop in your PDF.', 'Click convert to PPTX.', 'Open the deck in PowerPoint, Keynote or Google Slides.'],
    faqs: [
      { q: 'Is the PowerPoint editable?', a: 'Yes — it opens as a normal .pptx you can edit in PowerPoint, Keynote or Google Slides.' },
      { q: 'Are portrait PDFs handled?', a: 'Yes — pages are fitted onto landscape 16:9 slides so the deck is presentation-ready.' },
      SERVER_PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/convert/pdf-to-text': {
    heading: 'Convert PDF to plain text',
    intro: 'Extract the plain text from any PDF — fast, free and in your browser, with nothing uploaded.',
    steps: ['Drop in your PDF.', 'Click convert to text.', 'Copy or download the extracted .txt.'],
    faqs: [
      { q: 'How do I get plain text out of a PDF?', a: 'Open it in the PDF-to-Text tool — PDFShell extracts the text in your browser and lets you copy or download it.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/convert/pdf-to-images': {
    heading: 'Convert PDF to images (JPG / PNG)',
    intro: 'Export each page of a PDF as a high-quality image — in your browser, with nothing uploaded.',
    steps: ['Drop in your PDF.', 'Choose JPG or PNG.', 'Download the page images (or a zip of all pages).'],
    faqs: [
      { q: 'How do I turn PDF pages into images?', a: 'Open the PDF in the PDF-to-Images tool, pick JPG or PNG, and download each page as an image — all on your device.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/convert/docx-to-pdf': {
    heading: 'Convert Word (and Office) to PDF',
    intro: 'Convert Word, Excel and PowerPoint documents to clean, shareable PDFs with high fidelity.',
    steps: ['Drop in your Word/Office file.', 'Click convert to PDF.', 'Download the PDF — fonts and layout preserved.'],
    faqs: [
      { q: 'Does it keep my formatting?', a: 'Yes — conversion is done with LibreOffice on the server for high-fidelity layout and fonts.' },
      SERVER_PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/convert/images-to-pdf': {
    heading: 'Convert images to PDF',
    intro: 'Combine JPG and PNG images into a single PDF, in the order you choose — right in your browser, nothing uploaded.',
    steps: ['Drop in your images.', 'Arrange them in order.', 'Download them as one PDF.'],
    faqs: [
      { q: 'How do I combine photos into one PDF?', a: 'Drop the images into the Images-to-PDF tool, arrange them, and download a single PDF — all on your device.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
};

export function getToolContent(path: string): ToolContent | undefined {
  return TOOL_CONTENT[path];
}
