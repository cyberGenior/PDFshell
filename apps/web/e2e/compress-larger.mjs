// Reproduces the reported bug against the running container: aggressive flatten
// on a text PDF must now warn it grew the file and recommend keeping the original
// — never silently hand back a bigger "compressed" file.
//   node e2e/compress-larger.mjs
import { chromium } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const base = process.env.BASE ?? 'http://localhost:8080';

async function makeTextPdf(pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([595, 842]);
    for (let l = 0; l < 35; l++) {
      page.drawText(`Page ${p + 1}, line ${l + 1}: the quick brown fox jumps over the lazy dog.`, {
        x: 40, y: 800 - l * 21, size: 11, font,
      });
    }
  }
  return Buffer.from(await doc.save());
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.goto(`${base}/compress`, { waitUntil: 'networkidle' });

  await page.locator('input[type="file"]').setInputFiles({
    name: 'Hooked.pdf', mimeType: 'application/pdf', buffer: await makeTextPdf(60),
  });
  // Choose the aggressive method + smallest preset (the reported scenario).
  await page.getByText('Aggressive — flatten to images').click();
  await page.getByRole('button', { name: 'Compress', exact: true }).click();

  // Expect the new honest warning, NOT "already well optimised".
  const warn = page.getByText(/made the file larger/i);
  await warn.waitFor({ timeout: 60_000 });
  const keepBtn = page.getByRole('button', { name: 'Keep original' });
  if (!(await keepBtn.isVisible())) throw new Error('Keep original button missing');
  const stale = await page.getByText(/already well optimised/i).count();
  if (stale > 0) throw new Error('Still showing misleading "already well optimised" copy');

  await page.screenshot({ path: 'e2e/shot-compress-larger.png' });
  console.log('COMPRESS-LARGER OK — warns and offers Keep original');
} finally {
  await browser.close();
}
