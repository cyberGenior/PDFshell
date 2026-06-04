import { chromium } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const base = process.env.BASE ?? 'http://localhost:8080';

async function pdf() {
  const d = await PDFDocument.create();
  const f = await d.embedFont(StandardFonts.Helvetica);
  d.addPage([420, 560]).drawText('Sample report for AI toggle', { x: 40, y: 500, size: 16, font: f });
  return Buffer.from(await d.save());
}

const b = await chromium.launch({ channel: 'chrome' });
try {
  const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
  await p.goto(`${base}/convert/pdf-to-powerpoint`, { waitUntil: 'networkidle' });
  await p.locator('input[type="file"]').setInputFiles({ name: 'r.pdf', mimeType: 'application/pdf', buffer: await pdf() });

  await p.getByText(/Enhance with AI/).waitFor({ timeout: 10000 });
  // Give ai-status fetch a moment to resolve, then confirm the model is shown ready.
  await p.waitForFunction(() => document.body.innerText.includes('local llama'), { timeout: 8000 })
    .catch(() => {});
  const checkbox = p.locator('input[type="checkbox"]');
  const disabled = await checkbox.isDisabled();
  const bodyText = await p.locator('body').innerText();
  await p.screenshot({ path: 'e2e/shot-ai-toggle.png' });

  console.log('Toggle present:', bodyText.includes('Enhance with AI'));
  console.log('Model label:', /local llama[\d.:]+/.exec(bodyText)?.[0] ?? '(not shown)');
  console.log('Checkbox enabled:', !disabled);
  if (disabled) throw new Error('AI toggle is disabled (model not detected as available)');
  console.log('AI TOGGLE WIRED ✓');
} finally {
  await b.close();
}
