import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/** /robots.txt — index everything public; keep the admin, API and converter out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/svc'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
