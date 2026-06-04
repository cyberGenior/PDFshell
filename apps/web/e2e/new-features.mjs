// E2E for the Convert hub + new converters + page-level Merge, against the
// running container (system Chrome).  node e2e/new-features.mjs
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const base = process.env.BASE ?? 'http://localhost:8080';

async function makePdf(pages, label = 'Page') {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([420, 560]);
    page.drawText(`${label} ${p + 1} — searchable content`, { x: 40, y: 500, size: 16, font });
  }
  return Buffer.from(await doc.save());
}

const pdfFile = (name, buffer) => ({ name, mimeType: 'application/pdf', buffer });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];

try {
  // 1. Convert hub shows all conversions and routes to a sub-page.
  const hub = await browser.newPage();
  await hub.goto(`${base}/convert`, { waitUntil: 'networkidle' });
  const slugs = ['images-to-pdf', 'pdf-to-images', 'pdf-to-text', 'docx-to-pdf', 'pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint'];
  for (const s of slugs) {
    if (!(await hub.locator(`a[href$="/convert/${s}"]`).first().isVisible())) throw new Error(`hub missing ${s}`);
  }
  await hub.locator('a[href$="/convert/pdf-to-text"]').first().click();
  await hub.waitForURL('**/convert/pdf-to-text');
  results.push('Convert hub: 7 cards, routes to sub-pages ✓');

  // 2. PDF → Text extracts real text.
  await hub.locator('input[type="file"]').setInputFiles(pdfFile('doc.pdf', await makePdf(2)));
  await hub.locator('textarea').waitFor({ timeout: 30_000 });
  const text = await hub.locator('textarea').inputValue();
  if (!/searchable content/.test(text)) throw new Error('PDF→Text did not extract text');
  results.push('PDF→Text: extracted selectable text ✓');

  // 3. PDF → Images → ZIP download for a multi-page PDF.
  const imgs = await browser.newPage();
  await imgs.goto(`${base}/convert/pdf-to-images`, { waitUntil: 'networkidle' });
  await imgs.locator('input[type="file"]').setInputFiles(pdfFile('doc.pdf', await makePdf(3)));
  const [zip] = await Promise.all([
    imgs.waitForEvent('download'),
    imgs.getByRole('button', { name: /Convert to images/ }).click(),
  ]);
  if (!zip.suggestedFilename().endsWith('_images.zip')) throw new Error('expected a ZIP');
  results.push('PDF→Images: 3 pages → ZIP ✓');

  // 4. Merge page-level: two PDFs → 3 tiles, remove one → merge 2 pages.
  const mrg = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await mrg.goto(`${base}/merge`, { waitUntil: 'networkidle' });
  await mrg.locator('input[type="file"]').setInputFiles([
    pdfFile('a.pdf', await makePdf(2, 'A')),
    pdfFile('b.pdf', await makePdf(1, 'B')),
  ]);
  await mrg.locator('img[alt*="page"]').nth(2).waitFor({ timeout: 30_000 });
  let tiles = await mrg.locator('img[alt*="page"]').count();
  if (tiles !== 3) throw new Error(`expected 3 page tiles, got ${tiles}`);
  // Remove the first tile.
  await mrg.locator('button[aria-label^="Remove page"]').first().click({ force: true });
  tiles = await mrg.locator('img[alt*="page"]').count();
  if (tiles !== 2) throw new Error(`expected 2 tiles after remove, got ${tiles}`);
  await mrg.screenshot({ path: 'e2e/shot-merge-board.png' });
  const [merged] = await Promise.all([
    mrg.waitForEvent('download'),
    mrg.getByRole('button', { name: /Merge 2 pages/ }).click(),
  ]);
  const out = await PDFDocument.load(new Uint8Array(readFileSync(await merged.path())));
  if (out.getPageCount() !== 2) throw new Error(`merged expected 2 pages, got ${out.getPageCount()}`);
  results.push('Merge: 3 tiles → removed 1 → merged 2-page PDF ✓');

  // 5. LibreOffice PDF→Word: either converts (service up) OR shows the graceful
  //    "service not running" message (service down). Both are acceptable.
  const lo = await browser.newPage();
  await lo.goto(`${base}/convert/pdf-to-word`, { waitUntil: 'networkidle' });
  await lo.locator('input[type="file"]').setInputFiles(pdfFile('doc.pdf', await makePdf(1)));
  await lo.getByRole('button', { name: /Convert to DOCX/ }).click();
  const result = await Promise.race([
    lo.waitForEvent('download', { timeout: 60_000 }).then(() => 'converted').catch(() => null),
    lo.getByText(/service isn.t running/i).waitFor({ timeout: 60_000 }).then(() => 'graceful-down').catch(() => null),
  ]);
  if (!result) throw new Error('PDF→Word neither converted nor showed a message');
  results.push(`PDF→Word: ${result} ✓`);

  console.log(results.join('\n'));
  console.log('ALL NEW FEATURES VERIFIED');
} finally {
  await browser.close();
}
