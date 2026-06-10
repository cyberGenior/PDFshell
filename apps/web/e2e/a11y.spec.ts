import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automated accessibility gate: axe-core scans the public pages and fails on
 * serious/critical violations. Catches regressions in labels, contrast and
 * ARIA wiring that manual review misses.
 */
const ROUTES = [
  '/',
  '/merge',
  '/split',
  '/compress',
  '/rotate',
  '/page-numbers',
  '/watermark',
  '/crop',
  '/protect',
  '/ocr',
  '/guides',
];

for (const route of ROUTES) {
  test(`a11y: ${route} has no serious/critical violations`, async ({ page }) => {
    await page.goto(route);
    // Dev-server first compiles can paint before styles settle, which makes
    // axe's colour-contrast checks flaky — wait for full render.
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`),
    ).toEqual([]);
  });
}
