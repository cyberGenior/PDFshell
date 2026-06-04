/**
 * Client-side document conversion helpers. All dynamically imported so the
 * conversion libraries (mammoth, jsPDF) never load until the Convert tool is
 * actually used.
 */
import type { jsPDF } from 'jspdf';
import { imagesToPdf, type ImageInput } from '@pdfshell/pdf-core';

/** Decode any browser-supported image and re-encode to PNG bytes via canvas. */
async function fileToPngBytes(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Image encoding failed.');
  return new Uint8Array(await blob.arrayBuffer());
}

/** Convert one or more images into a single PDF, one image per page. */
export async function convertImagesToPdf(files: File[]): Promise<Uint8Array> {
  const images: ImageInput[] = [];
  for (const file of files) {
    images.push({ bytes: await fileToPngBytes(file), format: 'png' });
  }
  return imagesToPdf(images);
}

/** A single laid-out block of text destined for the PDF. */
interface Block {
  text: string;
  size: number;
  bold: boolean;
  gapBefore: number;
  bullet?: boolean;
}

/** Flatten mammoth's HTML into ordered, styled text blocks. */
function blocksFromHtml(html: string): Block[] {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const blocks: Block[] = [];
  const headingSize = [0, 22, 18, 15, 13, 12, 11];

  const walk = (el: Element) => {
    for (const node of Array.from(el.children)) {
      const tag = node.tagName.toLowerCase();
      const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();

      if (/^h[1-6]$/.test(tag)) {
        if (text) blocks.push({ text, size: headingSize[+tag[1]!] ?? 12, bold: true, gapBefore: 12 });
      } else if (tag === 'p') {
        if (text) blocks.push({ text, size: 11, bold: false, gapBefore: 7 });
      } else if (tag === 'ul' || tag === 'ol') {
        node.querySelectorAll(':scope > li').forEach((li) => {
          const t = (li.textContent ?? '').replace(/\s+/g, ' ').trim();
          if (t) blocks.push({ text: t, size: 11, bold: false, gapBefore: 3, bullet: true });
        });
      } else if (['div', 'section', 'article', 'table', 'thead', 'tbody', 'tr'].includes(tag)) {
        walk(node); // recurse into containers
      } else if (text) {
        blocks.push({ text, size: 11, bold: false, gapBefore: 7 });
      }
    }
  };
  walk(doc.body);
  return blocks;
}

/**
 * Convert a DOCX file to PDF: mammoth (DOCX → semantic HTML) → jsPDF text.
 *
 * We render real, selectable text (not a rasterised screenshot). That fixes the
 * blank-page problem of the old html2canvas path, keeps the output light and
 * searchable, and works offline. Trade-off, surfaced in the UI: this captures
 * the document's text and basic structure (headings, paragraphs, lists) — it is
 * not a pixel-perfect reproduction of complex Word layouts, tables, or images.
 */
export async function convertDocxToPdf(file: File): Promise<Uint8Array> {
  const [{ default: mammoth }, { jsPDF }] = await Promise.all([
    import('mammoth'),
    import('jspdf'),
  ]);

  const { value: html } = await mammoth.convertToHtml({
    arrayBuffer: await file.arrayBuffer(),
  });
  const blocks = blocksFromHtml(html);

  const pdf: jsPDF = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 56;
  const maxWidth = pageW - margin * 2;
  let y = margin;

  const writeLine = (line: string, x: number, lineHeight: number) => {
    if (y + lineHeight > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, x, y, { baseline: 'top' });
    y += lineHeight;
  };

  if (blocks.length === 0) {
    pdf.setFont('helvetica', 'italic').setFontSize(11);
    pdf.text('(This document has no extractable text.)', margin, margin, { baseline: 'top' });
  }

  for (const block of blocks) {
    pdf.setFont('helvetica', block.bold ? 'bold' : 'normal').setFontSize(block.size);
    const lineHeight = block.size * 1.35;
    const indent = block.bullet ? 16 : 0;
    const text = block.bullet ? `•  ${block.text}` : block.text;
    const lines = pdf.splitTextToSize(text, maxWidth - indent) as string[];
    y += block.gapBefore;
    for (const line of lines) writeLine(line, margin + indent, lineHeight);
  }

  return new Uint8Array(pdf.output('arraybuffer'));
}
