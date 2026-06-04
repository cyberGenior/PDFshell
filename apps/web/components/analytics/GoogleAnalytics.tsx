'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// GA4 measurement id. Defaults to the project's tag so analytics works without
// extra Render build-arg config; override with NEXT_PUBLIC_GA_ID if you fork.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-QGT6Z51E3P';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Google Analytics 4. Loads gtag.js after the page is interactive (so it never
 * blocks the tools) and sends a page_view on every client-side route change —
 * the App Router doesn't fire one automatically. Renders nothing when unset.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== 'function') return;
    if (pathname.startsWith('/admin')) return; // keep the admin out of public analytics
    window.gtag('event', 'page_view', { page_path: pathname });
  }, [pathname]);

  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });`}
      </Script>
    </>
  );
}
