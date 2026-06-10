import { test, expect, type Page } from '@playwright/test';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';

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

async function upload(page: Page, buffer: Buffer, name = 'fixture.pdf') {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles([{ name, mimeType: 'application/pdf', buffer }]);
}

async function downloadBytes(page: Page, trigger: () => Promise<void>): Promise<Buffer> {
  const downloadPromise = page.waitForEvent('download');
  await trigger();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

test('rotate: per-page rotation lands in the output PDF', async ({ page }) => {
  await page.goto('/rotate');
  await upload(page, await makePdf(2));

  // Rotate page 1 by 180° (two clicks on its tile).
  const tile = page.getByRole('button', { name: /Page 1, rotated/ });
  await tile.click();
  await tile.click();
  await expect(page.getByRole('button', { name: /Page 1, rotated 180°/ })).toBeVisible();

  const bytes = await downloadBytes(page, () =>
    page.getByRole('button', { name: 'Apply rotation & download' }).click(),
  );
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPage(0).getRotation().angle).toBe(180);
  expect(doc.getPage(1).getRotation().angle).toBe(0);
});

test('page numbers: stamps and downloads', async ({ page }) => {
  await page.goto('/page-numbers');
  await upload(page, await makePdf(3));
  await expect(page.getByText('3 pages')).toBeVisible();

  const bytes = await downloadBytes(page, () =>
    page.getByRole('button', { name: 'Add page numbers & download' }).click(),
  );
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(3);
});

test('watermark: live preview and download', async ({ page }) => {
  await page.goto('/watermark');
  await upload(page, await makePdf(1));

  await page.getByLabel('Watermark text').fill('DRAFT');
  await expect(page.getByText('Preview — page 1')).toBeVisible();

  const plain = await makePdf(1);
  const bytes = await downloadBytes(page, () =>
    page.getByRole('button', { name: 'Add watermark & download' }).click(),
  );
  expect(bytes.byteLength).toBeGreaterThan(plain.byteLength);
});

test('crop: sliders set the CropBox', async ({ page }) => {
  await page.goto('/crop');
  await upload(page, await makePdf(1));
  await expect(page.getByText('Preview — page 1', { exact: false })).toBeVisible();

  await page.getByLabel('Trim from left').fill('20');
  await page.getByLabel('Trim from right').fill('20');

  const bytes = await downloadBytes(page, () =>
    page.getByRole('button', { name: 'Crop & download' }).click(),
  );
  const crop = (await PDFDocument.load(bytes)).getPage(0).getCropBox();
  expect(crop.width).toBeCloseTo(400 * 0.6, 0);
});

test('compress: on-device flatten produces a PDF and reports outcome', async ({ page }) => {
  await page.goto('/compress');
  await upload(page, await makePdf(2));

  await page.getByRole('radio', { name: /Strong, on-device \(flatten\)/ }).click();
  await page.getByRole('button', { name: 'Compress', exact: true }).click();

  // Flatten of a text-only PDF may come out larger or smaller — either a
  // download button or the "already optimised" note must appear.
  await expect(
    page
      .getByRole('button', { name: 'Download compressed PDF' })
      .or(page.getByText('Already well optimised', { exact: false })),
  ).toBeVisible({ timeout: 60_000 });
});

test('chaining: merge result flows into compress without re-upload', async ({ page }) => {
  await page.goto('/merge');
  await upload(page, await makePdf(2));
  await expect(page.getByText('2 pages from 1 file')).toBeVisible();

  await downloadBytes(page, () =>
    page.getByRole('button', { name: 'Save reordered PDF' }).click(),
  );

  // The "keep working" strip appears; send the result to Compress.
  await expect(page.getByText('Keep working with')).toBeVisible();
  await page.getByRole('button', { name: /^Compress/ }).click();
  await page.waitForURL('**/compress');

  // Compress page picked the document up from the handoff store.
  await expect(page.getByText('_organised.pdf', { exact: false })).toBeVisible();
});

test('merge: keyboard reordering works without a pointer', async ({ page }) => {
  await page.goto('/merge');
  await upload(page, await makePdf(3));
  await expect(page.getByText('3 pages from 1 file')).toBeVisible();

  const first = page.getByRole('listitem').first();
  await first.focus();
  await page.keyboard.press('ArrowRight');

  // After moving right, the first tile in DOM order is the old page 2.
  await expect(
    page.getByRole('listitem').first(),
  ).toHaveAccessibleName(/page 2, position 1 of 3/i);
});

test('rotated fixture sanity: pdf-lib reads our rotation back', async () => {
  // Guards the e2e assertions above against pdf-lib API drift.
  const doc = await PDFDocument.create();
  const p = doc.addPage([100, 100]);
  p.setRotation(degrees(90));
  const reloaded = await PDFDocument.load(await doc.save());
  expect(reloaded.getPage(0).getRotation().angle).toBe(90);
});
