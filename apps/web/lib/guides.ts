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
  {
    slug: 'scan-documents-to-pdf-android',
    title: 'How to scan documents to PDF on an Android phone',
    description:
      'Use your Android phone’s camera to scan documents into a clean, scanner-style PDF — free, no app to install, and nothing uploaded.',
    intro:
      'You don’t need a flatbed scanner or a paid scanner app to turn paper into a PDF. If you have an Android phone, its camera is enough — and with PDFShell the photos become a tidy, multi-page PDF right in your browser, with nothing uploaded.',
    sections: [
      {
        heading: 'Scan a document with your phone',
        steps: [
          'Open Scan to PDF on your phone’s browser.',
          'Tap “Take a photo” and capture each page — flat, well-lit, filling the frame.',
          'Reorder, rotate or remove pages, and keep “Clean up” on for crisp black-and-white documents.',
          'Tap “Create PDF” and download — or send it straight to OCR to make it searchable.',
        ],
      },
      {
        heading: 'Getting scanner-quality results',
        paragraphs: [
          'The “Clean up” option boosts contrast and whitens the paper, so a phone photo reads like a real scan instead of a snapshot. Shoot on a dark, flat surface with even light and avoid shadows for the sharpest result.',
          'Everything runs on your device, which matters on a metered connection: you’re not uploading large photos, and the finished PDF never leaves your phone.',
        ],
      },
    ],
    faqs: [
      { q: 'Do I need to install an app?', a: 'No — Scan to PDF runs in your phone’s browser. There’s nothing to install and nothing is uploaded.' },
      { q: 'Can I make the scan searchable?', a: 'Yes — after creating the PDF, send it to the OCR tool to recognise the text and save a searchable PDF, all on your device.' },
    ],
    tool: { href: '/scan', label: 'Open Scan to PDF' },
    published: '2026-06-12',
  },
  {
    slug: 'password-protect-pdf-free',
    title: 'How to password-protect a PDF for free',
    description:
      'Add a strong AES-256 password to a PDF so it can’t be opened without it — free, with no watermark, and remove a password you know.',
    intro:
      'If you’re emailing a payslip, an ID or a contract, a password stops the wrong people opening it. Here’s how to encrypt a PDF with a password for free — and how to remove one from a file you own.',
    sections: [
      {
        heading: 'Add a password to a PDF',
        steps: [
          'Open the Protect & Unlock tool and choose “Protect”.',
          'Drop in your PDF.',
          'Type a strong password twice to confirm it.',
          'Download the encrypted PDF — opening it now requires the password.',
        ],
      },
      {
        heading: 'How strong is it, and can you remove a password?',
        paragraphs: [
          'Files are encrypted with AES-256, the strongest standard PDF encryption — without the password the content can’t be read. Choose a password you won’t forget and share it through a separate channel from the file itself.',
          'To remove protection, choose “Unlock” and enter the correct password. PDFShell can’t crack or bypass a password you don’t know — that’s the point of encryption.',
        ],
      },
    ],
    faqs: [
      { q: 'What encryption is used?', a: 'AES-256, the strongest encryption supported by the PDF standard.' },
      { q: 'Can you recover a password I’ve forgotten?', a: 'No — unlocking requires the correct password. PDFShell never bypasses encryption.' },
    ],
    tool: { href: '/protect', label: 'Open Protect & Unlock' },
    published: '2026-06-12',
  },
  {
    slug: 'convert-word-to-pdf-free',
    title: 'How to convert a Word document to PDF',
    description:
      'Turn a Word (.docx) document into a clean, shareable PDF that looks the same on every device — free and private, in your browser.',
    intro:
      'A Word file can look different on every computer, and not everyone has Word. Converting it to PDF locks the layout and fonts so it looks identical for everyone. Here’s how to do it for free.',
    sections: [
      {
        heading: 'Convert Word to PDF',
        steps: [
          'Open the Word to PDF tool.',
          'Drop in your .docx file.',
          'Click convert — the layout, headings and fonts are preserved.',
          'Download the PDF, ready to email or print.',
        ],
      },
      {
        heading: 'Why convert to PDF before sharing',
        paragraphs: [
          'A PDF fixes the formatting so your document can’t reflow or shift on someone else’s device, and it opens everywhere without Office installed. That makes it the safe format for CVs, invoices, letters and forms you send to others.',
        ],
      },
    ],
    faqs: [
      { q: 'Will my formatting be preserved?', a: 'Yes — fonts, headings, tables and layout are kept, so the PDF matches your Word document.' },
      { q: 'Is it free?', a: 'Yes — free, with no watermark and no sign-up.' },
    ],
    tool: { href: '/convert/docx-to-pdf', label: 'Open Word to PDF' },
    published: '2026-06-12',
  },
  {
    slug: 'add-page-numbers-to-pdf',
    title: 'How to add page numbers to a PDF',
    description:
      'Stamp page numbers onto a PDF — choose the position, format and starting number, and skip the cover page — free and in your browser.',
    intro:
      'Reports, contracts and dissertations usually need page numbers. Rather than re-export from the original app, you can stamp them straight onto a finished PDF. Here’s how, for free.',
    sections: [
      {
        heading: 'Number the pages of a PDF',
        steps: [
          'Open the Page numbers tool and drop in your PDF.',
          'Choose where the number sits (a corner or the centre) and the format — 4, 4 / 12, or Page 4 of 12.',
          'Set the starting number and the page range if you want to skip a cover page.',
          'Download the numbered PDF.',
        ],
      },
      {
        heading: 'Skipping the cover page',
        paragraphs: [
          'To leave the first page unnumbered, set the range to start from page 2. You can also set the start number so numbering begins at 1 on the second page — handy for documents with a separate title page.',
        ],
      },
    ],
    faqs: [
      { q: 'Can I start numbering from a later page?', a: 'Yes — set the page range to begin where you want, and choose the start number independently.' },
      { q: 'Which formats are supported?', a: 'Plain numbers (4), compact (4 / 12) or full text (Page 4 of 12), in any corner or centred.' },
    ],
    tool: { href: '/page-numbers', label: 'Open Page numbers' },
    published: '2026-06-12',
  },
  {
    slug: 'rotate-pdf-pages',
    title: 'How to rotate and fix sideways PDF pages',
    description:
      'Permanently rotate sideways or upside-down PDF pages by 90°, 180° or 270° — single pages or the whole file, free and in your browser.',
    intro:
      'Scans and phone photos often come out sideways or upside down. Here’s how to rotate PDF pages so they’re the right way up — and make the fix permanent, not just a temporary view.',
    sections: [
      {
        heading: 'Rotate PDF pages',
        steps: [
          'Open the Rotate tool and drop in your PDF — every page shows as a thumbnail.',
          'Click a page to turn it 90°; click again for 180° or 270°.',
          'Use “Rotate all” to turn the whole document at once.',
          'Download — the new orientation is saved into the file.',
        ],
      },
      {
        heading: 'Permanent vs. temporary rotation',
        paragraphs: [
          'Rotating a page in a viewer only changes how you see it; reopen the file and it’s sideways again. PDFShell writes the rotation into the PDF itself, so the page stays upright everywhere. Rotation only changes orientation — it never re-encodes the page, so there’s no loss of quality.',
        ],
      },
    ],
    faqs: [
      { q: 'Can I rotate just one page?', a: 'Yes — click that page’s thumbnail; each click turns it another 90°, and other pages are untouched.' },
      { q: 'Will rotating reduce quality?', a: 'No — only the orientation flag changes; the page content is never re-encoded.' },
    ],
    tool: { href: '/rotate', label: 'Open the Rotate tool' },
    published: '2026-06-12',
  },
  {
    slug: 'add-watermark-to-pdf',
    title: 'How to add a watermark to a PDF',
    description:
      'Stamp DRAFT, CONFIDENTIAL or your name diagonally across every page of a PDF — adjust size, angle and opacity, free and in your browser.',
    intro:
      'A watermark marks a document as a draft, confidential, or yours. Here’s how to stamp text diagonally across every page of a PDF for free, with full control over how it looks.',
    sections: [
      {
        heading: 'Add a text watermark',
        steps: [
          'Open the Watermark tool and drop in your PDF.',
          'Type the watermark text — for example DRAFT, CONFIDENTIAL or your company name.',
          'Tune the size, angle, colour and opacity using the live preview.',
          'Download the watermarked PDF.',
        ],
      },
      {
        heading: 'Keeping the page readable',
        paragraphs: [
          'A watermark should be visible without hiding the content. Because it’s semi-transparent and you control the opacity, the page text stays readable underneath. You can also limit the watermark to a range of pages if you don’t want it on every one.',
        ],
      },
    ],
    faqs: [
      { q: 'Will the watermark cover my text?', a: 'No — it’s semi-transparent and you set the opacity, so the content stays readable beneath it.' },
      { q: 'Can I watermark only some pages?', a: 'Yes — set the page range before applying.' },
    ],
    tool: { href: '/watermark', label: 'Open the Watermark tool' },
    published: '2026-06-12',
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
