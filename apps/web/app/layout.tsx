import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { AdSenseScript } from '@/components/ads/AdSense';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '@/lib/seo';
import './globals.css';

const DEFAULT_TITLE = 'PDFShell — Free, privacy-first PDF tools';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'PDF tools', 'merge PDF', 'split PDF', 'compress PDF', 'edit PDF', 'OCR PDF',
    'PDF to Word', 'PDF to Excel', 'PDF to PowerPoint', 'free PDF editor',
    'online PDF', 'privacy PDF', 'in-browser PDF',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', siteName: SITE_NAME, url: '/',
    title: DEFAULT_TITLE, description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: DEFAULT_TITLE, description: SITE_DESCRIPTION },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any (web browser)',
  description: SITE_DESCRIPTION,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'Merge & organize PDF', 'Split PDF', 'Compress PDF', 'Edit PDF', 'OCR scanned PDF',
    'PDF to Word', 'PDF to Excel', 'PDF to PowerPoint', 'PDF to text', 'PDF to images', 'Images to PDF',
  ],
};

export const viewport: Viewport = {
  themeColor: '#f7f8fb',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Root layout: just the document shell + global providers. The public app chrome
 * (AppShell) lives in the (site) group; the admin panel brings its own chrome —
 * so /admin is not wrapped in the PDF tool sidebar.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <ServiceWorkerRegistrar />
        <GoogleAnalytics />
        <AdSenseScript />
        {children}
      </body>
    </html>
  );
}
