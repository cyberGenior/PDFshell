import type { MetadataRoute } from 'next';
import { SITE_URL, PAGES } from '@/lib/seo';
import { GUIDES } from '@/lib/guides';

/** /sitemap.xml — the landing page, every tool route, and the guides. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ['', ...Object.keys(PAGES), '/guides', ...GUIDES.map((g) => `/guides/${g.slug}`)];
  return routes.map((r) => ({
    url: `${SITE_URL}${r}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: r === '' ? 1 : r.startsWith('/convert/') ? 0.6 : 0.7,
  }));
}
