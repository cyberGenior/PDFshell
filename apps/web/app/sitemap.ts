import type { MetadataRoute } from 'next';
import { SITE_URL, PAGES, CONTENT_REVISED, routeLastModified } from '@/lib/seo';
import { GUIDES } from '@/lib/guides';

/**
 * /sitemap.xml — the landing page, every tool route, and the guides. `lastModified`
 * uses stable per-route content dates (not `new Date()`), so Google can trust it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const toolRoutes: MetadataRoute.Sitemap = ['', ...Object.keys(PAGES)].map((r) => ({
    url: `${SITE_URL}${r}`,
    lastModified: routeLastModified(r || '/'),
    changeFrequency: 'weekly',
    priority: r === '' ? 1 : r.startsWith('/convert/') ? 0.6 : 0.7,
  }));

  const guideRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/guides`, lastModified: CONTENT_REVISED, changeFrequency: 'weekly', priority: 0.6 },
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}/guides/${g.slug}`,
      lastModified: g.updated ?? g.published,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];

  return [...toolRoutes, ...guideRoutes];
}
