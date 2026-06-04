import { chromium } from '@playwright/test';
const base = process.env.BASE ?? 'http://localhost:8080';
const b = await chromium.launch({ channel: 'chrome' });
try {
  const d = await b.newContext({ viewport: { width: 1300, height: 900 } });
  const p = await d.newPage();
  await p.goto(base, { waitUntil: 'networkidle' });
  await p.waitForSelector('text=All tools');
  await p.screenshot({ path: 'e2e/shot-home.png' });
  await p.goto(`${base}/split`, { waitUntil: 'networkidle' });
  await p.screenshot({ path: 'e2e/shot-tool.png' });
  const m = await b.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await m.newPage();
  await mp.goto(base, { waitUntil: 'networkidle' });
  await mp.waitForSelector('text=All tools');
  await mp.screenshot({ path: 'e2e/shot-mobile.png' });
  console.log('shots done');
} finally {
  await b.close();
}
