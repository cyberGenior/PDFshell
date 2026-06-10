import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { rotatePages, rotateAll, addPageNumbers, addWatermark, cropPages } from './index.js';

async function makePdf(n: number, size: [number, number] = [200, 300]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage(size);
  return doc.save();
}

describe('rotatePages / rotateAll', () => {
  it('rotates selected pages and accumulates with existing rotation', async () => {
    const out = await rotatePages(await makePdf(3), { 2: 90 });
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getRotation().angle).toBe(0);
    expect(doc.getPage(1).getRotation().angle).toBe(90);

    const again = await rotatePages(out, { 2: 270 });
    const doc2 = await PDFDocument.load(again);
    expect(doc2.getPage(1).getRotation().angle).toBe(0);
  });

  it('rotates every page with rotateAll and normalises negatives', async () => {
    const out = await rotateAll(await makePdf(2), -90);
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getRotation().angle).toBe(270);
    expect(doc.getPage(1).getRotation().angle).toBe(270);
  });

  it('rejects non-90 deltas and out-of-range pages', async () => {
    const pdf = await makePdf(1);
    await expect(rotatePages(pdf, { 1: 45 })).rejects.toThrow();
    await expect(rotatePages(pdf, { 2: 90 })).rejects.toThrow();
    await expect(rotatePages(pdf, {})).rejects.toThrow();
  });
});

describe('addPageNumbers', () => {
  it('stamps every page and survives a reload', async () => {
    const out = await addPageNumbers(await makePdf(3), { format: 'page-n-of-total' });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
    // Helvetica gets embedded only when something was drawn.
    expect(out.byteLength).toBeGreaterThan((await makePdf(3)).byteLength);
  });

  it('respects a sub-range and start number', async () => {
    const out = await addPageNumbers(await makePdf(5), { fromPage: 2, toPage: 4, startAt: 10 });
    expect((await PDFDocument.load(out)).getPageCount()).toBe(5);
    await expect(addPageNumbers(await makePdf(2), { fromPage: 3, toPage: 1 })).rejects.toThrow();
  });
});

describe('addWatermark', () => {
  it('stamps text on each page', async () => {
    const plain = await makePdf(2);
    const out = await addWatermark(plain, 'CONFIDENTIAL');
    expect((await PDFDocument.load(out)).getPageCount()).toBe(2);
    expect(out.byteLength).toBeGreaterThan(plain.byteLength);
  });

  it('rejects empty text', async () => {
    await expect(addWatermark(await makePdf(1), '   ')).rejects.toThrow();
  });
});

describe('cropPages', () => {
  it('sets the CropBox inside the MediaBox', async () => {
    const out = await cropPages(await makePdf(1, [200, 400]), {
      top: 0.1,
      bottom: 0.1,
      left: 0.25,
      right: 0.25,
    });
    const page = (await PDFDocument.load(out)).getPage(0);
    const crop = page.getCropBox();
    expect(crop.x).toBeCloseTo(50);
    expect(crop.width).toBeCloseTo(100);
    expect(crop.y).toBeCloseTo(40);
    expect(crop.height).toBeCloseTo(320);
  });

  it('rejects margins that erase the page', async () => {
    const pdf = await makePdf(1);
    await expect(
      cropPages(pdf, { top: 0, bottom: 0, left: 0.5, right: 0.5 }),
    ).rejects.toThrow();
  });
});
