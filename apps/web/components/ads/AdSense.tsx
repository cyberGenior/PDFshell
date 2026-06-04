'use client';

import Script from 'next/script';
import { useEffect } from 'react';

// Set NEXT_PUBLIC_ADSENSE_CLIENT (e.g. ca-pub-1234567890123456) to enable.
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Loads the Google AdSense library once (after interactive). Mounted in the root
 * layout. Renders nothing until NEXT_PUBLIC_ADSENSE_CLIENT is set. With Auto Ads
 * enabled in your AdSense dashboard this alone places ads; for manual placements
 * use <AdSenseUnit slot="…" />.
 */
export function AdSenseScript() {
  if (!CLIENT) return null;
  return (
    <Script
      id="adsbygoogle-lib"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
    />
  );
}

/**
 * A single AdSense ad unit. Create the unit in your AdSense dashboard to get its
 * slot id, then drop <AdSenseUnit slot="1234567890" /> where you want it.
 */
export function AdSenseUnit({
  slot,
  format = 'auto',
  responsive = true,
  className,
  style,
}: {
  slot: string;
  format?: string;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  useEffect(() => {
    if (!CLIENT) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* library not ready yet — AdSense retries on its own */
    }
  }, []);

  if (!CLIENT) return null;
  return (
    <ins
      className={`adsbygoogle ${className ?? ''}`}
      style={{ display: 'block', ...style }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
