import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { AdSenseScript } from '@/components/ads/AdSense';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDFShell — Privacy-first PDF toolkit',
  description:
    'Open-source, browser-based PDF toolkit. Merge, split, compress, edit, OCR and convert PDFs — entirely on your device.',
  applicationName: 'PDFShell',
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
        <ServiceWorkerRegistrar />
        <GoogleAnalytics />
        <AdSenseScript />
        {children}
      </body>
    </html>
  );
}
