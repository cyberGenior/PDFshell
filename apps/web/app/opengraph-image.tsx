import { ImageResponse } from 'next/og';

// Branded social share card, generated at build/runtime (no asset needed).
// Applies to all routes as the default og:image (and Twitter falls back to it).
export const alt = 'PDFShell — free, privacy-first PDF tools';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #9333ea 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '96px',
              height: '96px',
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.18)',
              fontSize: '60px',
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ fontSize: '72px', fontWeight: 800, letterSpacing: '-2px' }}>PDFShell</div>
        </div>

        <div style={{ marginTop: '40px', fontSize: '46px', fontWeight: 700, lineHeight: 1.15, maxWidth: '900px' }}>
          Free, privacy-first PDF tools
        </div>
        <div style={{ marginTop: '20px', fontSize: '30px', opacity: 0.92, maxWidth: '950px' }}>
          Merge · Split · Compress · Edit · OCR · Convert — right in your browser. Your files never
          leave your device.
        </div>
      </div>
    ),
    { ...size },
  );
}
