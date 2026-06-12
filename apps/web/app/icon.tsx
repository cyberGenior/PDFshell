import { ImageResponse } from 'next/og';

// File-based favicon. Generated from the brand gradient + "P" so there's no
// binary asset to maintain, and it fixes the /favicon.ico 404. Matches the PWA
// icons in app/pwa-icon/[spec]/route.tsx.
export const runtime = 'nodejs';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 7,
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #9333ea 100%)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: 22,
          fontFamily: 'sans-serif',
        }}
      >
        P
      </div>
    ),
    { ...size },
  );
}
