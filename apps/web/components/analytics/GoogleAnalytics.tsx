'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

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
 * Google Analytics 4. gtag.js loads after interactive and `config` fires the
 * initial page_view automatically (so data collection activates on the very
 * first visit — no dependency on React timing). The App Router doesn't emit a
 * page_view on client-side navigation, so we send one on each later route change
 * (skipping the first, which `config` already counted). Renders nothing if unset.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false; // config() already sent the initial page_view
      return;
    }
    if (typeof window.gtag !== 'function') return;
    if (pathname.startsWith('/admin')) return; // keep the admin out of public analytics
    window.gtag('event', 'page_view', {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
