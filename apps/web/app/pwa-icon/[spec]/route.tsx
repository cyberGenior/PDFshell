import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
// Icons never change for a given build — let the platform cache them hard.
export const dynamic = 'force-static';

const SPECS: Record<string, { size: number; maskable: boolean }> = {
  '192': { size: 192, maskable: false },
  '512': { size: 512, maskable: false },
  // Maskable: content inside the 80% safe zone, full-bleed background.
  'maskable-192': { size: 192, maskable: true },
  'maskable-512': { size: 512, maskable: true },
};

/**
 * PWA icons generated at request time (cached), matching the brand gradient —
 * no binary assets to maintain. Referenced by app/manifest.ts.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ spec: string }> }) {
  const { spec } = await ctx.params;
  const cfg = SPECS[spec];
  if (!cfg) return new Response('Not found', { status: 404 });

  const { size, maskable } = cfg;
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const fontSize = Math.round(size * (maskable ? 0.42 : 0.52));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: `${radius}px`,
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #9333ea 100%)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: `${fontSize}px`,
          fontFamily: 'sans-serif',
        }}
      >
        P
      </div>
    ),
    { width: size, height: size },
  );
}
