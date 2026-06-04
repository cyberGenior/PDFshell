import { chromium } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
const d = await PDFDocument.create();
const fb = await d.embedFont(StandardFonts.HelveticaBold);
const fr = await d.embedFont(StandardFonts.Helvetica);
const p = d.addPage([595, 842]);
p.drawText('Enterprise Risk Survey', { x: 60, y: 770, size: 26, font: fb });
p.drawRectangle({ x: 50, y: 690, width: 495, height: 40, color: rgb(1, 0.86, 0.78) });
p.drawText('Decision OriginalBandText goes here', { x: 64, y: 703, size: 14, font: fr, color: rgb(0.1, 0.1, 0.1) });
const pdf = Buffer.from(await d.save());
const b = await chromium.launch({ channel: 'chrome' });
try {
  const pg = await b.newPage({ viewport: { width: 1200, height: 980 } });
  await pg.goto('http://localhost:8080/edit', { waitUntil: 'networkidle' });
  await pg.locator('input[type="file"]').setInputFiles({ name: 'band.pdf', mimeType: 'application/pdf', buffer: pdf });
  await pg.locator('[role="textbox"]', { hasText: 'OriginalBandText' }).first().waitFor({ timeout: 20000 });
  const run = pg.locator('[role="textbox"]', { hasText: 'OriginalBandText' }).first();
  await run.click(); await pg.keyboard.press('Control+A'); await pg.keyboard.type('Decision EDITED-IN-PLACE here');
  const [dl] = await Promise.all([ pg.waitForEvent('download'), pg.getByRole('button', { name: /Download edited PDF/ }).click() ]);
  const fs = await import('node:fs'); const edited = fs.readFileSync(await dl.path());
  const pg2 = await b.newPage({ viewport: { width: 1200, height: 980 } });
  await pg2.goto('http://localhost:8080/edit', { waitUntil: 'networkidle' });
  await pg2.locator('input[type="file"]').setInputFiles({ name: 'edited.pdf', mimeType: 'application/pdf', buffer: edited });
  await pg2.locator('[role="textbox"]').first().waitFor({ timeout: 20000 });
  await pg2.waitForTimeout(800);
  await pg2.screenshot({ path: 'e2e/lift.png' });
  console.log('done');
} finally { await b.close(); }
