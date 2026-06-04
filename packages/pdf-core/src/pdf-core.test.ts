import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  mergePdfs,
  assemblePages,
  splitByRanges,
  splitEveryNPages,
  extractPages,
  parsePageRanges,
  getPageCount,
  getMetadata,
  setMetadata,
  imagesToPdf,
} from './index.js';

/** A valid 1×1 JPEG fixture. */
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB' +
  'AAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==';

/** Build a PDF with `n` blank pages for use as a fixture. */
async function makePdf(n: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage([200, 200]);
  return doc.save();
}

describe('parsePageRanges', () => {
  it('parses singles and ranges', () => {
    expect(parsePageRanges('1-3, 5, 8-10')).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 5 },
      { start: 8, end: 10 },
    ]);
  });

  it('rejects invalid syntax and bad bounds', () => {
    expect(() => parsePageRanges('abc')).toThrow();
    expect(() => parsePageRanges('5-2')).toThrow();
    expect(() => parsePageRanges('0')).toThrow();
    expect(() => parsePageRanges('')).toThrow();
  });
});

describe('mergePdfs', () => {
  it('concatenates page counts in order', async () => {
    const merged = await mergePdfs([await makePdf(2), await makePdf(3)]);
    expect(await getPageCount(merged)).toBe(5);
  });

  it('requires at least two inputs', async () => {
    await expect(mergePdfs([await makePdf(1)])).rejects.toThrow();
  });
});

describe('assemblePages', () => {
  it('interleaves and reorders pages across sources', async () => {
    const a = await makePdf(2); // source 0
    const b = await makePdf(3); // source 1
    const out = await assemblePages([a, b], [
      { sourceIndex: 1, pageNumber: 3 },
      { sourceIndex: 0, pageNumber: 1 },
      { sourceIndex: 1, pageNumber: 1 },
    ]);
    expect(await getPageCount(out)).toBe(3);
  });

  it('bounds-checks picks and rejects empty selections', async () => {
    const a = await makePdf(2);
    await expect(assemblePages([a], [])).rejects.toThrow();
    await expect(assemblePages([a], [{ sourceIndex: 0, pageNumber: 9 }])).rejects.toThrow();
    await expect(assemblePages([a], [{ sourceIndex: 5, pageNumber: 1 }])).rejects.toThrow();
  });
});

describe('split', () => {
  it('splits by explicit ranges', async () => {
    const parts = await splitByRanges(await makePdf(10), parsePageRanges('1-3, 7-10'));
    expect(parts).toHaveLength(2);
    expect(await getPageCount(parts[0]!)).toBe(3);
    expect(await getPageCount(parts[1]!)).toBe(4);
  });

  it('splits every N pages, last chunk short', async () => {
    const parts = await splitEveryNPages(await makePdf(7), 3);
    expect(parts.map(() => 0)).toHaveLength(3);
    expect(await getPageCount(parts[2]!)).toBe(1);
  });

  it('extracts arbitrary pages and bounds-checks', async () => {
    const out = await extractPages(await makePdf(5), [5, 1, 3]);
    expect(await getPageCount(out)).toBe(3);
    await expect(extractPages(await makePdf(2), [9])).rejects.toThrow();
  });
});

describe('imagesToPdf', () => {
  it('creates one page per image', async () => {
    const jpeg = Uint8Array.from(atob(TINY_JPEG_BASE64), (c) => c.charCodeAt(0));
    const pdf = await imagesToPdf([
      { bytes: jpeg, format: 'jpg' },
      { bytes: jpeg, format: 'jpg' },
    ]);
    expect(await getPageCount(pdf)).toBe(2);
  });

  it('rejects an empty image list', async () => {
    await expect(imagesToPdf([])).rejects.toThrow();
  });
});

describe('metadata', () => {
  it('round-trips a write then read', async () => {
    const updated = await setMetadata(await makePdf(1), {
      title: 'Spec',
      author: 'PDFShell',
      keywords: ['pdf', 'privacy'],
    });
    const meta = await getMetadata(updated);
    expect(meta.title).toBe('Spec');
    expect(meta.author).toBe('PDFShell');
    expect(meta.keywords).toContain('privacy');
  });
});
