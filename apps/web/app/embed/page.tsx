import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

// A compact, embeddable promo card. Designed to be dropped into any site via
// <iframe src="/embed">. Not indexed; clicking opens the full app in a new tab.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: `${SITE_NAME} — free PDF tools`,
};

export default function EmbedCard() {
  return (
    <a
      href={SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxSizing: 'border-box',
        minHeight: '100dvh',
        width: '100%',
        padding: '20px',
        textDecoration: 'none',
        color: '#ffffff',
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #9333ea 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/share/icon.jpg" alt="" width={64} height={64} style={{ borderRadius: '14px', flexShrink: 0 }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.3px' }}>
          {SITE_NAME}
        </span>
        <span style={{ display: 'block', fontSize: '13px', opacity: 0.92, marginTop: '2px', lineHeight: 1.35 }}>
          Free, private PDF tools — merge, edit, OCR &amp; convert, right in your browser.
        </span>
        <span
          style={{
            display: 'inline-block',
            marginTop: '10px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'rgba(255,255,255,0.18)',
            padding: '6px 12px',
            borderRadius: '999px',
          }}
        >
          Open the toolkit →
        </span>
      </span>
    </a>
  );
}
