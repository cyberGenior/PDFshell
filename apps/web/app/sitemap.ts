import type { MetadataRoute } from 'next';
import { SITE_URL, PAGES } from '@/lib/seo';

/** /sitemap.xml — the landing page + every public tool route. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ['', ...Object.keys(PAGES)];
  return routes.map((r) => ({
    url: `${SITE_URL}${r}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: r === '' ? 1 : r.startsWith('/convert/') ? 0.6 : 0.8,
  }));
}
