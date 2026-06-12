/**
 * Long-tail SEO guides. Each is a real how-to article that targets a specific
 * query and links to the matching tool — content + internal links that a bare
 * tool page can't provide. Rendered at /guides and /guides/[slug].
 */
export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  steps?: string[];
}

export interface Guide {
  slug: string;
  title: string; // <title> / H1
  description: string; // meta description
  intro: string;
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
  tool: { href: string; label: string };
  /** ISO date (YYYY-MM-DD) first published — drives Article schema + sitemap. */
  published: string;
  /** ISO date last meaningfully revised; defaults to `published`. */
  updated?: string;
}

export const GUIDES: Guide[] = [
  {
    slug: 'merge-pdf-without-uploading',
    title: 'How to merge PDFs without uploading them',
    description:
      'Combine PDF files into one without uploading them anywhere. A free, private way to merge and reorder PDF pages right in your browser.',
    intro:
      'Most “merge PDF” sites upload your documents to their servers. If your files are sensitive — contracts, IDs, statements — that’s a real privacy risk. Here’s how to merge PDFs entirely on your own device, with nothing uploaded.',
    sections: [
      {
        heading: 'Merge PDFs in your browser',
        steps: [
          'Open the Organize & Merge tool.',
          'Drop in the PDF files you want to combine.',
          'Drag the page thumbnails into the order you want, and remove any pages you don’t need.',
          'Click download to save one combined PDF.',
        ],
      },
      {
        heading: 'Why “no upload” matters',
        paragraphs: [
          'PDFShell runs in your browser using WebAssembly, so the files are processed locally and never sent to a server. That’s faster on slow or metered connections, and it means your documents stay private by default.',
        ],
      },
    ],
    faqs: [
      { q: 'Is it really private?', a: 'Yes — merging happens on your device. The files are never uploaded or stored.' },
      { q: 'Is there a page or size limit?', a: 'No artificial limits, no watermark, and no sign-up.' },
    ],
    tool: { href: '/merge', label: 'Open the Merge tool' },
    published: '2026-05-24',
  },
  {
    slug: 'convert-pdf-to-excel-free',
    title: 'How to convert a PDF to Excel for free',
    description:
      'Turn PDF tables and reports into an editable Excel spreadsheet with real, computable numbers — free, with layout and tables preserved.',
    intro:
      'Copy-pasting a PDF table into Excel usually destroys the layout and turns numbers into text. Here’s how to convert a PDF to a proper XLSX where the figures stay numeric and the tables keep their shape.',
    sections: [
      {
        heading: 'Convert PDF to Excel',
        steps: [
          'Open the PDF to Excel tool.',
          'Drop in your PDF report or statement.',
          'Click convert — PDFShell rebuilds the sections and tables into a styled sheet.',
          'Open the downloaded .xlsx in Excel, Google Sheets or LibreOffice.',
        ],
      },
      {
        heading: 'Numbers stay numbers',
        paragraphs: [
          'PDFShell writes real numeric cells (with percentage and decimal formats), not screenshots of numbers — so you can sort, sum, filter and chart the data immediately. Section headers, fonts and ruled tables are reconstructed so the sheet reads like the original document.',
        ],
      },
    ],
    faqs: [
      { q: 'Will formulas work on the result?', a: 'Yes — figures are written as numeric cells, so SUM, AVERAGE and charts work straight away.' },
      { q: 'Does it handle multi-page reports?', a: 'Yes — each page becomes a sheet, preserving the report’s structure.' },
    ],
    tool: { href: '/convert/pdf-to-excel', label: 'Open PDF to Excel' },
    published: '2026-05-26',
  },
  {
    slug: 'edit-pdf-free-online',
    title: 'How to edit a PDF for free (no watermark)',
    description:
      'Edit the text in a PDF and add new text anywhere — free, in your browser, matching the document’s own fonts, with no watermark or sign-up.',
    intro:
      'You don’t need Acrobat to fix a typo or fill in a PDF. Here’s how to edit existing PDF text in place — not just slap a text box on top — for free.',
    sections: [
      {
        heading: 'Edit PDF text in place',
        steps: [
          'Open the Edit tool and load your PDF.',
          'Click directly on a line of text to edit it, or click an empty spot to add new text.',
          'Adjust the font size and colour if needed.',
          'Download — only the lines you changed are rewritten, using the document’s embedded font.',
        ],
      },
      {
        heading: 'Editing scanned PDFs',
        paragraphs: [
          'If your PDF is a scan, PDFShell reads it with on-device OCR so you can edit the recognised text; the changed word is then redrawn over the scan. Everything runs in your browser, so the document is never uploaded.',
        ],
      },
    ],
    faqs: [
      { q: 'Can I edit existing text, not just add a box?', a: 'Yes — click a line and retype it; the original glyphs are removed so there’s no overlap.' },
      { q: 'Is there a watermark?', a: 'No watermark, no sign-up, completely free.' },
    ],
    tool: { href: '/edit', label: 'Open the Edit tool' },
    published: '2026-05-28',
  },
  {
    slug: 'ocr-scanned-pdf-to-text',
    title: 'How to OCR a scanned PDF into searchable text',
    description:
      'Convert a scanned PDF or image into selectable, searchable text with free OCR in 100+ languages — running entirely in your browser.',
    intro:
      'A scanned document is just a picture of text — you can’t search or copy it. OCR (optical character recognition) fixes that. Here’s how to do it for free without uploading the scan.',
    sections: [
      {
        heading: 'Run OCR on your device',
        steps: [
          'Open the OCR tool.',
          'Drop in a scanned PDF or an image.',
          'Choose the language(s) and run OCR — it processes locally.',
          'Copy the recognised text or download a searchable PDF.',
        ],
      },
      {
        heading: 'Languages and privacy',
        paragraphs: [
          'PDFShell uses Tesseract in the browser, supporting 100+ languages including many used across Africa. Because recognition runs on your device, sensitive scans never leave your computer.',
        ],
      },
    ],
    faqs: [
      { q: 'Do I need to install anything?', a: 'No — OCR runs in the browser, nothing to install and nothing uploaded.' },
      { q: 'Can I get a searchable PDF out?', a: 'Yes — export a PDF with a hidden text layer so it’s searchable and selectable.' },
    ],
    tool: { href: '/ocr', label: 'Open the OCR tool' },
    published: '2026-05-30',
  },
  {
    slug: 'compress-pdf-for-email',
    title: 'How to compress a PDF so it’s small enough to email',
    description:
      'Reduce PDF file size to get under email attachment limits — free, in your browser, without blurring your text.',
    intro:
      'Email attachment limits (often 25 MB) are a common headache. Here’s how to shrink a PDF enough to send, without wrecking the quality.',
    sections: [
      {
        heading: 'Compress a PDF',
        steps: [
          'Open the Compress tool.',
          'Drop in your PDF.',
          'Choose lossless to keep text sharp, or a stronger preset for scan-heavy files.',
          'Download the smaller file — PDFShell never returns a file larger than the original.',
        ],
      },
      {
        heading: 'Lossless vs. stronger compression',
        paragraphs: [
          'Lossless mode re-optimises the file structure and keeps text and vectors perfectly crisp. For PDFs that are mostly scanned images, the stronger presets downsample those images for a much smaller file. Pick based on whether your PDF is text or scans.',
        ],
      },
    ],
    faqs: [
      { q: 'Will compression blur my text?', a: 'No — lossless mode keeps text crisp. Only the stronger image presets re-encode embedded images.' },
      { q: 'Is it free and private?', a: 'Yes — lossless compression runs in your browser, free and with nothing uploaded.' },
    ],
    tool: { href: '/compress', label: 'Open the Compress tool' },
    published: '2026-06-01',
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
