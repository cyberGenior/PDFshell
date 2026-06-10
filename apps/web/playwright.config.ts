import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. We drive the *system* Chrome (channel: 'chrome') instead of
 * downloading Chromium — keeps the toolchain light and matches what most users
 * here actually run. The dev server is started automatically.
 *
 * In containers/CI without a system Chrome, set PDFSHELL_PW_CHANNEL=bundled
 * (after `playwright install chromium`) to use Playwright's own Chromium.
 */
const channel = process.env.PDFSHELL_PW_CHANNEL ?? 'chrome';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    // Dedicated port — port 3000 is often taken by another local project, so we
    // never reuse it. Playwright starts our own isolated PDFShell dev server.
    baseURL: 'http://localhost:4317',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], ...(channel === 'bundled' ? {} : { channel }) },
    },
  ],
  webServer: {
    command: 'pnpm exec next dev -p 4317',
    url: 'http://localhost:4317',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
