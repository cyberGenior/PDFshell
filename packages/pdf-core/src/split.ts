import { PDFDocument } from 'pdf-lib';
import type { PageRange, PdfInput } from './types.js';
import { loadDocument } from './internal.js';

/**
 * Parse a human page-range string into structured {@link PageRange}s.
 *
 * Accepts comma-separated singles and ranges, e.g. "1-3, 5, 8-10".
 * Whitespace is ignored. Ranges are 1-based and inclusive.
 *
 * @throws if the syntax is invalid or a bound is < 1 / start > end.
 */
export function parsePageRanges(spec: string): PageRange[] {
  const ranges: PageRange[] = [];

  for (const rawPart of spec.split(',')) {
    const part = rawPart.trim();
    if (part === '') continue;

    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) {
      throw new Error(`Invalid page range segment: "${part}"`);
    }

    const start = Number(match[1]);
    const end = match[2] !== undefined ? Number(match[2]) : start;

    if (start < 1) throw new Error(`Page numbers are 1-based; got ${start}.`);
    if (start > end) {
      throw new Error(`Range start (${start}) is after end (${end}).`);
    }

    ranges.push({ start, end });
  }

  if (ranges.length === 0) {
    throw new Error('No page ranges were provided.');
  }
  return ranges;
}

/** Build a new single PDF containing only the given 1-based page numbers. */
export async function extractPages(
  input: PdfInput,
  pageNumbers: number[],
): Promise<Uint8Array> {
  const src = await loadDocument(input);
  const total = src.getPageCount();

  const indices = pageNumbers.map((n) => {
    if (n < 1 || n > total) {
      throw new Error(`Page ${n} is out of bounds (1-${total}).`);
    }
    return n - 1;
  });

  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  for (const page of pages) out.addPage(page);
  return out.save();
}

/**
 * Split a PDF into one output document per supplied range.
 *
 * @returns An array of PDFs, parallel to `ranges`.
 */
export async function splitByRanges(
  input: PdfInput,
  ranges: PageRange[],
): Promise<Uint8Array[]> {
  const src = await loadDocument(input);
  const total = src.getPageCount();
  const results: Uint8Array[] = [];

  for (const { start, end } of ranges) {
    if (end > total) {
      throw new Error(`Range end ${end} exceeds page count ${total}.`);
    }
    const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, indices);
    for (const page of pages) out.addPage(page);
    results.push(await out.save());
  }

  return results;
}

/** Split a PDF into chunks of at most `size` pages each. */
export async function splitEveryNPages(
  input: PdfInput,
  size: number,
): Promise<Uint8Array[]> {
  if (size < 1) throw new Error('Chunk size must be >= 1.');

  const src = await loadDocument(input);
  const total = src.getPageCount();

  const ranges: PageRange[] = [];
  for (let start = 1; start <= total; start += size) {
    ranges.push({ start, end: Math.min(start + size - 1, total) });
  }
  return splitByRanges(input, ranges);
}
