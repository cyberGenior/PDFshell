import { test, expect, type Page } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { deflateSync, crc32 } from 'node:zlib';

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

/** Minimal valid PNG (same generator as tools.spec.ts). */
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
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0x4a)]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function dropOnLanding(page: Page, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  await page.goto('/');
  await page.locator('input[type="file"]').first().setInputFiles(files);
}

test('landing drop: single PDF shows the action chooser, routes to the tool with the file', async ({ page }) => {
  await dropOnLanding(page, [
    { name: 'report.pdf', mimeType: 'application/pdf', buffer: await makePdf(2) },
  ]);

  await expect(page.getByText('What do you want to do with it?')).toBeVisible();
  await expect(page.getByText('report.pdf')).toBeVisible();

  await page.getByRole('button', { name: /Compress it/ }).click();
  await page.waitForURL('**/compress');
  // The compress page picked the file up from the handoff store.
  await expect(page.getByText('report.pdf')).toBeVisible();
});

test('landing drop: several PDFs go straight to merge', async ({ page }) => {
  await dropOnLanding(page, [
    { name: 'a.pdf', mimeType: 'application/pdf', buffer: await makePdf(2) },
    { name: 'b.pdf', mimeType: 'application/pdf', buffer: await makePdf(2) },
  ]);
  await page.waitForURL('**/merge');
  await expect(page.getByText('4 pages from 2 files')).toBeVisible({ timeout: 30_000 });
});

test('landing drop: images route to images-to-pdf preloaded', async ({ page }) => {
  await dropOnLanding(page, [
    { name: 'photo.png', mimeType: 'image/png', buffer: makePng() },
  ]);
  await page.waitForURL('**/convert/images-to-pdf');
  await expect(page.getByText('photo.png')).toBeVisible();
  await expect(page.getByRole('button', { name: /Convert 1 image/ })).toBeVisible();
});

test('result card: appears after merge with download + keep-working, and feeds local stats', async ({ page }) => {
  await page.goto('/merge');
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles([{ name: 'doc.pdf', mimeType: 'application/pdf', buffer: await makePdf(2) }]);
  await expect(page.getByText('2 pages from 1 file')).toBeVisible({ timeout: 30_000 });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save reordered PDF' }).click();
  await downloadPromise;

  // Result card: filename, a Download button, and the chaining strip.
  await expect(page.getByText('doc_organised.pdf')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
  await expect(page.getByText('Keep working with another tool')).toBeVisible();

  // Back on the landing page, the personal stats and recents reflect the work.
  await page.goto('/');
  await expect(page.getByText(/file you processed/)).toBeVisible();
  await expect(page.getByText('Recently used')).toBeVisible();
  // The recents chip (exact name) — distinct from the sidebar link and tool card.
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Organize & Merge', exact: true }),
  ).toBeVisible();
});
