import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  compressLossless,
  assembleImagePdf,
  classifyOutcome,
  PRESETS,
  DEFAULT_PRESET,
} from './index.js';

/** A valid 1×1 JPEG, used to exercise the image-assembly path. */
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
  'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB' +
  'AAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==';

function tinyJpeg(): Uint8Array {
  return Uint8Array.from(atob(TINY_JPEG_BASE64), (c) => c.charCodeAt(0));
}

async function makeTextPdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Page ${p + 1}`, { x: 40, y: 800, size: 12, font });
  }
  return doc.save();
}

describe('presets', () => {
  it('defaults to ebook with a sane DPI ladder', () => {
    expect(DEFAULT_PRESET).toBe('ebook');
    expect(PRESETS.screen.dpi).toBeLessThan(PRESETS.printer.dpi);
  });
});

describe('classifyOutcome', () => {
  it('labels smaller / unchanged / larger with a ±1% dead-zone', () => {
    expect(classifyOutcome(1000, 600)).toBe('smaller');
    expect(classifyOutcome(1000, 1000)).toBe('unchanged');
    expect(classifyOutcome(1000, 1005)).toBe('unchanged'); // within 1%
    expect(classifyOutcome(1000, 5000)).toBe('larger');
  });
});

describe('compressLossless', () => {
  it('returns a valid PDF and reports sizes', async () => {
    const input = await makeTextPdf(10);
    const res = await compressLossless(input);
    expect(res.originalSize).toBe(input.byteLength);
    expect(res.compressedSize).toBeGreaterThan(0);
    const reopened = await PDFDocument.load(res.bytes);
    expect(reopened.getPageCount()).toBe(10);
    expect(res.ratio).toBeCloseTo(1 - res.compressedSize / res.originalSize, 6);
  });

  it('NEVER returns a file larger than the input', async () => {
    // A tiny, already-compact PDF is the case where re-saving tends to grow it.
    const input = await makeTextPdf(1);
    const res = await compressLossless(input);
    expect(res.compressedSize).toBeLessThanOrEqual(res.originalSize);
    expect(res.outcome).not.toBe('larger');
    if (res.keptOriginal) {
      expect(res.compressedSize).toBe(res.originalSize);
      expect(res.bytes).toBe(input); // handed back the untouched original
    }
  });
});

describe('assembleImagePdf', () => {
  it('builds a one-image-per-page PDF from JPEG bytes', async () => {
    const original = await makeTextPdf(3);
    const pages = Array.from({ length: 3 }, () => ({
      jpeg: tinyJpeg(),
      widthPt: 595,
      heightPt: 842,
    }));
    const res = await assembleImagePdf(pages, original);
    const reopened = await PDFDocument.load(res.bytes);
    expect(reopened.getPageCount()).toBe(3);
    const [first] = reopened.getPages();
    expect(Math.round(first!.getWidth())).toBe(595);
    // Outcome is always reported so the UI can warn when flattening grew the file.
    expect(['smaller', 'unchanged', 'larger']).toContain(res.outcome);
  });

  it('rejects an empty page set', async () => {
    await expect(assembleImagePdf([], new Uint8Array(1))).rejects.toThrow();
  });
});
