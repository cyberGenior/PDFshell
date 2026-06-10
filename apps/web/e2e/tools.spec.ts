import { deflateSync, crc32 } from 'node:zlib';
import { test, expect, type Page } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

/** Build an N-page PDF fixture as a Buffer for upload. */
async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([400, 560]);
    page.drawText(`Page ${p + 1}`, { x: 40, y: 500, size: 24, font });
  }
  return Buffer.from(await doc.save());
}

/** Build a valid solid-colour RGB PNG so the browser can actually decode it. */
function makePng(size = 8): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData) >>> 0, 0);
    return Buffer.concat([len, typeAndData, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour (RGB)

  // Raw scanlines: each row = filter byte (0) + RGB triplets.
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0x4a)]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function upload(page: Page, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  await page.locator('input[type="file"]').setInputFiles(files);
}

test('landing shows the core tools', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  for (const name of ['Organize & Merge', 'Split', 'Compress', 'Edit', 'OCR', 'Convert', 'Rotate', 'Watermark']) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }
});

test('merge: two PDFs → one download', async ({ page }) => {
  await page.goto('/merge');
  await upload(page, [
    { name: 'a.pdf', mimeType: 'application/pdf', buffer: await makePdf(2) },
    { name: 'b.pdf', mimeType: 'application/pdf', buffer: await makePdf(3) },
  ]);
  // 2 + 3 pages render as one reorderable grid.
  await expect(page.getByText('5 pages from 2 files')).toBeVisible({ timeout: 30_000 });
  const btn = page.getByRole('button', { name: /Merge 5 pages/ });
  await expect(btn).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent('download'), btn.click()]);
  expect(download.suggestedFilename()).toBe('merged.pdf');
});

test('split: PDF.js preview renders, then split downloads', async ({ page }) => {
  await page.goto('/split');
  await upload(page, [{ name: 'doc.pdf', mimeType: 'application/pdf', buffer: await makePdf(3) }]);
  // The preview strip proves PDF.js canvas rendering works in-browser.
  await expect(page.locator('img[alt="Page 1"]')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'All', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Extract 3 pages/ }).click(),
  ]);
  expect(download.suggestedFilename()).toContain('_extract');
});

test('compress: lossless re-save reports a result', async ({ page }) => {
  await page.goto('/compress');
  await upload(page, [{ name: 'big.pdf', mimeType: 'application/pdf', buffer: await makePdf(8) }]);
  await page.getByRole('radio', { name: /Lossless, on-device/ }).click();
  await page.getByRole('button', { name: 'Compress', exact: true }).click();
  // A tiny fixture may already be optimal — either outcome is a valid result.
  await expect(
    page
      .getByRole('button', { name: /Download compressed PDF/ })
      .or(page.getByText('Already well optimised', { exact: false })),
  ).toBeVisible({ timeout: 30_000 });
});

test('convert: image → PDF download', async ({ page }) => {
  await page.goto('/convert/images-to-pdf');
  await upload(page, [{ name: 'shot.png', mimeType: 'image/png', buffer: makePng() }]);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Convert 1 image/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('converted.pdf');
});
