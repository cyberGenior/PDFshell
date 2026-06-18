/**
 * SEO completeness guard. Every tool/conversion must have:
 *   - a PAGES entry in lib/seo.ts  → unique title/description/canonical + sitemap
 *   - a toolContent entry          → real on-page intro/steps/FAQ (no thin pages)
 *
 * Run: `node scripts/check-routes.mjs` (also wired into `pnpm type-check`).
 * Fails the check (exit 1) on a missing PAGES entry; warns on missing content.
 * Deliberately a source-text scan (no TS import) so it stays dependency-free.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

/** All `slug: '...'` values in a file. */
const slugs = (src) => [...src.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]);
/** All top-level route keys like `'/merge':` in a file. */
const routeKeys = (src) => new Set([...src.matchAll(/'(\/[^']*)'\s*:/g)].map((m) => m[1]));

const toolSlugs = slugs(read('lib/tools.ts'));
const convSlugs = slugs(read('lib/conversions.ts'));
const pages = routeKeys(read('lib/seo.ts'));
const content = routeKeys(read('lib/toolContent.ts'));

const expected = [
  ...toolSlugs.map((s) => `/${s}`),
  ...convSlugs.map((s) => `/convert/${s}`),
];

const missingPages = expected.filter((r) => !pages.has(r));
const missingContent = expected.filter((r) => !content.has(r));

if (missingContent.length) {
  console.warn('⚠ Routes without a toolContent entry (thin page):\n  ' + missingContent.join('\n  '));
}
if (missingPages.length) {
  console.error('✖ Routes missing a PAGES entry in lib/seo.ts (no metadata/canonical/sitemap):\n  ' + missingPages.join('\n  '));
  console.error('\nAdd each to PAGES in apps/web/lib/seo.ts so it gets metadata and lands in the sitemap.');
  process.exit(1);
}

console.log(`✓ SEO routes OK — ${expected.length} tool/conversion routes all have metadata.`);
