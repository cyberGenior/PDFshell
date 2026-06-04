// Verifies the OCR flagship against the running container (system Chrome):
// real recognition, the word-box verifier, and the Searchable PDF export.
//   node e2e/ocr.mjs
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const base = process.env.BASE ?? 'http://localhost:8080';

async function makeTextPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([600, 400]);
  page.drawText('INVOICE TOTAL', { x: 60, y: 300, size: 40, font });
  page.drawText('AMOUNT 1200', { x: 60, y: 230, size: 40, font });
  return Buffer.from(await doc.save());
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1300, height: 950 } });
  await page.goto(`${base}/ocr`, { waitUntil: 'networkidle' });

  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'scan.pdf', mimeType: 'application/pdf', buffer: await makeTextPdf(),
  });

  // Consent to the engine download, then run (first run pulls ~12MB lang data).
  const consent = page.getByRole('button', { name: /Download & continue/ });
  if (await consent.isVisible().catch(() => false)) await consent.click();
  else await page.getByRole('button', { name: /Extract text/ }).click();

  // Wait for the verifier: word-box buttons appear once recognition completes.
  await page.locator('button[title*="%"]').first().waitFor({ timeout: 120_000 });
  const boxes = await page.locator('button[title*="%"]').count();
  if (boxes === 0) throw new Error('no OCR word boxes rendered');
  await page.locator('button[title*="%"]').nth(1).click(); // select a word to show highlight
  await page.screenshot({ path: 'e2e/shot-ocr.png' });
  console.log(`OCR verifier: ${boxes} word boxes with confidence ✓`);

  // Confidence summary present.
  await page.getByText(/Avg confidence/).waitFor({ timeout: 5_000 });

  // Text tab shows the recognised words.
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  const text = await page.locator('textarea').inputValue();
  if (!/INVOICE|TOTAL|AMOUNT|1200/i.test(text)) throw new Error(`OCR text missing expected words: "${text.slice(0,80)}"`);
  console.log(`OCR text tab: recognised "${text.replace(/\s+/g, ' ').trim().slice(0, 40)}…" ✓`);

  // Searchable PDF export → valid PDF.
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Searchable PDF/ }).click(),
  ]);
  const bytes = readFileSync(await dl.path());
  const out = await PDFDocument.load(new Uint8Array(bytes));
  if (out.getPageCount() < 1) throw new Error('searchable PDF has no pages');

  // Prove the (invisible) text layer is real by extracting it with our own
  // PDF→Text tool (PDF.js getTextContent reads text regardless of opacity).
  const verify = await browser.newPage();
  await verify.goto(`${base}/convert/pdf-to-text`, { waitUntil: 'networkidle' });
  await verify.locator('input[type="file"]').setInputFiles({
    name: 'searchable.pdf', mimeType: 'application/pdf', buffer: bytes,
  });
  await verify.locator('textarea').waitFor({ timeout: 30_000 });
  const extracted = await verify.locator('textarea').inputValue();
  if (!/INVOICE|TOTAL|AMOUNT|1200/i.test(extracted)) {
    throw new Error(`searchable PDF text layer not extractable: "${extracted.slice(0, 80)}"`);
  }
  console.log(`Searchable PDF: ${out.getPageCount()} page(s); text layer extractable via PDF→Text ✓`);

  console.log('OCR FLAGSHIP VERIFIED');
} finally {
  await browser.close();
}
