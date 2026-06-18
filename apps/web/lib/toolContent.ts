/**
 * On-page SEO content for each tool: a short intro, how-to steps, and an FAQ.
 * Rendered by <ToolSeoContent /> below the tool widget and emitted as FAQ
 * structured data. Fixes "thin content" (a bare tool widget rarely ranks).
 *
 * Keyed by route path (same keys as PAGES in lib/seo.ts). Each route's layout
 * renders <ToolSeoContent path="..."> with its OWN path, so the /convert hub entry
 * shows only on /convert (sub-pages pass their own path) — no duplication.
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
      'Combining PDFs shouldn’t mean uploading private documents to a stranger’s server. PDFShell merges and organises PDFs entirely in your browser: drop in two or more files — contracts, scans, receipts, a cover letter and a CV — and they’re stitched into one clean document on your own device. Drag the page thumbnails into any order, rotate or duplicate a page, and delete the ones you don’t need, so “merge” doubles as a full page organiser. Because everything runs locally with WebAssembly, it’s fast even on a slow or metered connection, with no sign-up, no watermark and no page limit. When the order looks right, download a single combined PDF — your files never leave your device.',
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
      'Splitting a PDF lets you pull exactly the pages you need out of a larger file — a single chapter from a textbook, one form from a bundle, or a signed page from a contract — without sending the whole document anywhere. PDFShell does it entirely in your browser: drop in your PDF, choose the pages or ranges to extract (for example 1–3, 5, and 8–10), and download them as a new file. You can also split one PDF into several separate documents in a single pass. There’s no upload, no watermark and no sign-up, and because the work happens on your device it stays quick even on a weak connection.',
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
      'Email and chat apps often reject PDFs over 25 MB, and scanned documents are the worst offenders. PDFShell shrinks a PDF so it’s small enough to send — without wrecking the quality. Lossless mode re-optimises the file’s structure in your browser and keeps text and vectors perfectly crisp; the stronger “flatten” option re-encodes scanned pages as compressed images for a much smaller file, ideal for photographed or scanned documents. You get a before-and-after preview of the first page and the exact size saved, and PDFShell never hands back a file larger than the one you started with. Lossless compression runs entirely on your device with nothing uploaded, so even sensitive files stay private.',
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
      'You shouldn’t need expensive desktop software just to fix a typo or fill in a PDF. PDFShell lets you edit the existing text in a PDF in place — click a line and retype it — as well as add new text anywhere on the page, matching the document’s own fonts. Instead of leaving the old text faintly showing through behind your change, it lifts the page so edits sit cleanly with no ghosting. You can also add a signature: draw it or upload an image, then drag and resize it onto the page. Scanned PDFs are handled too, read with on-device OCR so you can edit the recognised text. Everything runs in your browser, with no watermark and nothing uploaded.',
    steps: [
      'Open your PDF in the editor.',
      'Click any line to edit it in place, or click an empty area to add new text.',
      'Add a signature: draw or upload one, then drag it into position.',
      'Download your edited PDF — only the lines you changed are rewritten.',
    ],
    faqs: [
      { q: 'Can I edit existing text in a PDF, not just add a text box?', a: 'Yes — click a line and retype it. PDFShell reuses the document’s embedded font and removes the original glyphs so there’s no overlap.' },
      { q: 'Can I sign a PDF?', a: 'Yes — click “Add signature”, draw it with your mouse or finger (or upload an image), then drag and resize it onto the page. The signature is embedded right in your browser.' },
      { q: 'Can I edit a scanned PDF?', a: 'Yes — scanned pages are read with on-device OCR so you can edit the recognised text, then the edited word is redrawn over the scan.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/scan': {
    heading: 'Scan documents to PDF with your phone',
    intro:
      'Use your phone or webcam to photograph paper documents and turn them into a clean, scanner-style PDF. PDFShell boosts contrast and whitens the paper so the result reads like a real scan — and everything happens on your device, with nothing uploaded.',
    steps: [
      'Tap “Take a photo” to snap each page (or drop in photos you already have).',
      'Reorder, rotate or remove pages, and toggle “Clean up” for crisp black-and-white documents.',
      'Create the PDF and download it — or send it straight to OCR to make it searchable.',
    ],
    faqs: [
      { q: 'How do I scan a document to PDF without an app?', a: 'Open Scan to PDF on your phone, take a photo of each page, and PDFShell assembles them into a single PDF in your browser — no app install and nothing uploaded.' },
      { q: 'Can I make the scan searchable?', a: 'Yes — after creating the PDF, send it to the OCR tool to recognise the text and save a searchable PDF, all on your device.' },
      { q: 'Why do my photos look like proper scans?', a: 'The “Clean up” option stretches contrast and whitens the background so a phone photo of a page reads like a flatbed scan. Turn it off for colour pages or photos.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/flows': {
    heading: 'One-click PDF workflows',
    intro:
      'Some jobs take more than one tool. A photographed contract usually needs scanning, then cleaning up, then making searchable. PDFShell workflows chain those steps into a single guided flow: start one and your file is handed from tool to tool in memory — no re-uploading, no re-selecting, and nothing leaves your device. Built-in flows include “Scan & clean up” (photograph pages, then compress), “Scan to searchable PDF” (photograph pages, then OCR), and “Combine & compress” (merge several PDFs, then shrink the result). Each step is a normal tool, so you stay in control and can stop or branch off at any point.',
    steps: [
      'Pick a workflow from the cards above.',
      'Complete the first tool — take photos, drop files, or set options.',
      'Press “Continue” to hand the result to the next step, and download the finished PDF.',
    ],
    faqs: [
      { q: 'Do my files get uploaded between steps?', a: 'No — the result of each step is passed to the next entirely in your browser’s memory. Nothing is uploaded or stored.' },
      { q: 'Can I stop partway through a workflow?', a: 'Yes — every step is a normal tool. You can download at any step, exit the workflow, or carry the file into a different tool.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/ocr': {
    heading: 'OCR a scanned PDF to searchable text',
    intro:
      'A scanned document is just a picture of text — you can’t search it, select it or copy from it. OCR (optical character recognition) turns that image back into real, selectable text. PDFShell runs OCR entirely in your browser using Tesseract, in over 100 languages including many used across Africa, so even sensitive scans never leave your device. Drop in a scanned PDF or a photo of a page, pick the language, and PDFShell recognises the text on your device — then you can copy it, export a .txt file, or download a searchable PDF with an invisible text layer behind the original image. It’s free, works offline once the language is downloaded, and adds no watermark.',
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
  '/convert': {
    heading: 'Convert PDF to and from Word, Excel, PowerPoint, images and text',
    intro:
      'PDFShell converts PDFs into the formats you actually work in — Word (DOCX), Excel (XLSX), PowerPoint (PPTX), plain text and images — and turns Word documents and images back into PDF. The document conversions (PDF to Word, Excel and PowerPoint) run on the self-hosted LibreOffice service for high-fidelity layout; the rest — PDF to text, PDF to images, images to PDF and Word to PDF — run entirely in your browser, so nothing is uploaded and they work offline. Either way there is no watermark, no sign-up and no page limit. Pick a conversion below to get started.',
    steps: [
      'Choose the conversion you need from the cards above.',
      'Drop in your file — a PDF, a Word document, or images.',
      'Download the converted file, ready to edit in Office, Google Docs or your image viewer.',
    ],
    faqs: [
      { q: 'Which conversions run on my device and which use the server?', a: 'PDF to text, PDF to images, images to PDF and Word to PDF run fully in your browser (private and offline). PDF to Word, Excel and PowerPoint use the self-hosted LibreOffice service because that quality of reconstruction needs desktop-class tooling.' },
      { q: 'Will the formatting be preserved?', a: 'Yes — the Office conversions reconstruct paragraphs, headings, tables and fonts so the result closely matches the original, rather than dumping raw text.' },
      { q: 'Are the converted numbers and text editable?', a: 'Yes — you get real editable documents: numeric cells in Excel, editable paragraphs in Word, real slides in PowerPoint — not screenshots.' },
      FREE_FAQ,
    ],
  },
  '/convert/pdf-to-word': {
    heading: 'Convert PDF to Word (DOCX)',
    intro:
      'Re-typing a PDF into Word wastes hours and introduces mistakes. PDFShell converts a PDF into an editable Microsoft Word (.docx) document with the layout, headings, paragraphs and tables reconstructed — not just the raw text dumped onto a page — so you can keep working on it in Word, Google Docs or LibreOffice. The conversion runs on the self-hosted LibreOffice service because faithfully rebuilding a document’s structure needs desktop-class tooling; your file is processed in memory and deleted straight after, never shared or kept. There’s no watermark and no sign-up, and the result is a genuine editable document you can change, comment on and re-export.',
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
      'Copy-pasting a PDF table into Excel usually destroys the layout and turns figures into useless text. PDFShell converts a PDF into a proper Excel (.xlsx) spreadsheet where the numbers stay real, computable numbers — so you can sort, sum, filter and chart them immediately. Section headers, fonts and ruled tables are reconstructed so each sheet reads like the original report or bank statement, and multi-page documents keep their structure. The conversion runs on the self-hosted LibreOffice service (your file is processed in memory and deleted right after), with no watermark and no sign-up. The result is a working spreadsheet, not a screenshot of one.',
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
  '/rotate': {
    heading: 'Rotate PDF pages online, free',
    intro:
      'Fix sideways or upside-down pages in seconds. Rotate individual pages or the whole PDF by 90°, 180° or 270° — entirely in your browser, with nothing uploaded.',
    steps: [
      'Drop in your PDF — every page appears as a thumbnail.',
      'Click a page to turn it 90°, or use “Rotate all” for the whole document.',
      'Download the corrected PDF.',
    ],
    faqs: [
      { q: 'How do I rotate just one page of a PDF?', a: 'Click that page’s thumbnail in the Rotate tool — each click turns it another 90°. Other pages are untouched.' },
      { q: 'Will rotating reduce quality?', a: 'No — rotation only changes the page’s orientation flag; the content is never re-encoded.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/page-numbers': {
    heading: 'Add page numbers to a PDF',
    intro:
      'Stamp page numbers onto a PDF — pick the corner or centre, the format (1, 1 / 10, or Page 1 of 10), the starting number and the page range. Processed on your device, nothing uploaded.',
    steps: [
      'Drop in your PDF.',
      'Choose position, format and the number to start from.',
      'Download the numbered PDF.',
    ],
    faqs: [
      { q: 'Can I skip the cover page?', a: 'Yes — set the page range to start from page 2 (and the start number to 1 if you want numbering to begin there).' },
      { q: 'Which formats are supported?', a: 'Plain numbers (4), compact (4 / 12), or full text (Page 4 of 12), in any corner or centred.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/watermark': {
    heading: 'Add a text watermark to a PDF',
    intro:
      'Stamp DRAFT, CONFIDENTIAL, your company name or any text diagonally across every page. Adjust size, transparency and colour — all in your browser, with nothing uploaded.',
    steps: [
      'Drop in your PDF.',
      'Type the watermark text and tune opacity, angle and colour with the live preview.',
      'Download the watermarked PDF.',
    ],
    faqs: [
      { q: 'Can I watermark only some pages?', a: 'Yes — set the page range before applying.' },
      { q: 'Will the watermark cover my text?', a: 'The watermark is semi-transparent (you control the opacity), so the page content stays readable underneath.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/crop': {
    heading: 'Crop PDF pages online',
    intro:
      'Trim white margins or unwanted edges off PDF pages with a live preview. Great for tightening scans and slides before sharing — processed entirely on your device.',
    steps: [
      'Drop in your PDF — the first page shows as a live preview.',
      'Drag the margin sliders until the crop frame fits.',
      'Apply to every page (or a range) and download.',
    ],
    faqs: [
      { q: 'Is cropping destructive?', a: 'No — PDFShell sets the page’s crop box, so viewers show the trimmed page but the full content remains in the file and can be un-cropped later.' },
      { q: 'Can I crop pages of different sizes?', a: 'Yes — margins are proportional, so the same trim works across mixed page sizes.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/protect': {
    heading: 'Password-protect a PDF (or unlock one)',
    intro:
      'Encrypt a PDF with AES-256 so it needs a password to open — or remove the password from a PDF you own and know the password to.',
    steps: [
      'Drop in your PDF and choose Protect or Unlock.',
      'Type the password (twice for Protect, to confirm).',
      'Download the protected or unlocked PDF.',
    ],
    faqs: [
      { q: 'How strong is the protection?', a: 'Files are encrypted with AES-256, the strongest standard PDF encryption — without the password the content can’t be read.' },
      { q: 'Can you remove a password I forgot?', a: 'No — unlocking requires the correct password. PDFShell does not crack or bypass encryption.' },
      SERVER_PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/redact': {
    heading: 'Redact a PDF — permanently remove sensitive content',
    intro:
      'Redacting a PDF means more than drawing a black box over a name or number — done properly, the text and images underneath are deleted from the file, so they can’t be selected, copied, or recovered. PDFShell does true redaction: open your PDF, drag a box across anything you want gone — account numbers, signatures, addresses, faces — across as many pages as you like, and download a clean copy with that content permanently removed. It’s the safe way to share contracts, bank statements, medical records or ID scans without leaking what’s underneath. Your file is processed on the PDFShell server and deleted immediately after — never stored.',
    steps: [
      'Drop in the PDF you want to redact.',
      'Drag a box over each piece of text or image to remove — on any page.',
      'Click “Redact & download” to get a copy with that content permanently deleted.',
    ],
    faqs: [
      { q: 'Is the content really gone, or just hidden?', a: 'Really gone. PDFShell removes the underlying text and image data beneath each box (not just a black rectangle on top), so it can’t be copied, searched, or recovered.' },
      { q: 'Can I redact more than one area or page?', a: 'Yes — add as many boxes as you need across every page, then apply them all at once.' },
      SERVER_PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
  '/fill': {
    heading: 'Fill in a PDF form online',
    intro:
      'Lots of PDFs — applications, tax and government forms, contracts, invoices — ship as interactive forms with real fields you’re meant to type into. PDFShell detects those fields automatically and places an input right where each one sits on the page, so you can fill the whole form in your browser without printing, scanning, or installing anything. Type your answers, tick the checkboxes, pick from dropdowns, then download a completed copy — and optionally “flatten” it so the answers are locked in and look like part of the document. It all happens on your device: the form and everything you type stay private and are never uploaded. If a PDF isn’t an interactive form, the Edit tool lets you place text anywhere on the page instead.',
    steps: [
      'Drop in a fillable PDF form.',
      'Type into the detected fields, tick boxes and choose options.',
      'Optionally flatten to lock the answers, then download the completed form.',
    ],
    faqs: [
      { q: 'How do I fill a PDF form without printing it?', a: 'Open the PDF here — PDFShell finds its form fields and lets you type straight into them, then download the completed file. No printing or scanning.' },
      { q: 'What if my PDF isn’t a fillable form?', a: 'If the PDF has no interactive fields, use the Edit tool to place text anywhere on the page instead.' },
      { q: 'What does “flatten” do?', a: 'Flattening merges your answers into the page so they can’t be edited and display identically everywhere — handy before sending a form back.' },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
  },
};

export function getToolContent(path: string): ToolContent | undefined {
  return TOOL_CONTENT[path];
}
