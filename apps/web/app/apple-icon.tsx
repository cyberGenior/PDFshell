import { ImageResponse } from 'next/og';

// apple-touch-icon for iOS home-screen installs. Full-bleed (iOS applies its own
// rounded mask), same brand gradient as the favicon and PWA icons.
export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #9333ea 100%)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: 104,
          fontFamily: 'sans-serif',
        }}
      >
        P
      </div>
    ),
    { ...size },
  );
}
