// Ad-hoc visual smoke against the running Docker container (system Chrome).
//   node e2e/visual-smoke.mjs
import { chromium } from '@playwright/test';

const base = process.env.BASE ?? 'http://localhost:8080';
const browser = await chromium.launch({ channel: 'chrome' });

try {
  // Desktop
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=All tools');
  if (!(await page.locator('aside a:has-text("Merge")').first().isVisible())) {
    throw new Error('Sidebar Merge nav not visible');
  }
  await page.screenshot({ path: 'e2e/shot-home.png' });

  // Navigate to a tool (client-side) and confirm the dropzone renders.
  await page.locator('aside a:has-text("Compress")').first().click();
  await page.waitForSelector('input[type="file"]');
  await page.screenshot({ path: 'e2e/shot-compress.png' });

  // Mobile: sidebar should be hidden behind the hamburger.
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await m.newPage();
  await mp.goto(base, { waitUntil: 'networkidle' });
  await mp.waitForSelector('text=All tools');
  await mp.screenshot({ path: 'e2e/shot-mobile-home.png' });
  // Open the drawer.
  await mp.getByLabel('Open menu').click();
  await mp.waitForTimeout(400);
  await mp.screenshot({ path: 'e2e/shot-mobile-drawer.png' });

  console.log('VISUAL SMOKE OK — screenshots written to e2e/');
} finally {
  await browser.close();
}
