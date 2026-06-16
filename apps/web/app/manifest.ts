import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo';

/**
 * Web app manifest → makes PDFShell installable (Add to Home Screen). Combined
 * with the service worker's asset + app-shell caching, an installed PDFShell
 * behaves like a native app and the on-device tools keep working offline —
 * exactly what users on metered connections need.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — free, private PDF tools`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f7f8fb',
    theme_color: '#f7f8fb',
    categories: ['productivity', 'utilities'],
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      { name: 'Merge & organize PDF', url: '/merge' },
      { name: 'Compress PDF', url: '/compress' },
      { name: 'OCR a scan', url: '/ocr' },
      { name: 'Convert PDF', url: '/convert' },
    ],
  };
}
