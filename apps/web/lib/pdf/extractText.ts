import { loadPdf } from './render';

/**
 * Extract selectable text from a PDF, page by page, using PDF.js. Works only on
 * PDFs that actually contain a text layer — scanned/image PDFs return little or
 * nothing (use OCR for those). Runs entirely in the browser.
 */
export async function extractPdfText(
  bytes: Uint8Array,
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  const pdf = await loadPdf(bytes);
  try {
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/[ \t]+/g, ' ')
        .trim();
      parts.push(text);
      onProgress?.(i, pdf.numPages);
    }
    return parts.join('\n\n').trim();
  } finally {
    await pdf.destroy();
  }
}
