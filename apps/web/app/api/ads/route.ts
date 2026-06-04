import { NextResponse } from 'next/server';
import { activeAdsByPlacement } from '@/lib/server/ads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public: active ads for a placement (used by the landing slots + popup). */
export async function GET(req: Request) {
  const placement = new URL(req.url).searchParams.get('placement') ?? '';
  if (!placement) return NextResponse.json({ ads: [] });
  return NextResponse.json({ ads: activeAdsByPlacement(placement) });
}
