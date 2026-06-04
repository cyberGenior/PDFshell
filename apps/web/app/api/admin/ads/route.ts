import { NextResponse } from 'next/server';
import { getSessionAdmin, audit } from '@/lib/server/auth';
import { listAdsWithStats, createAd, type Placement } from '@/lib/server/ads';

export const runtime = 'nodejs';

const PLACEMENTS = new Set(['landing-banner', 'landing-grid', 'sidebar', 'popup']);

export async function GET() {
  if (!(await getSessionAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ ads: listAdsWithStats() });
}

export async function POST(req: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const title = (b.title ?? '').trim();
  const placement = (b.placement ?? '') as Placement;
  if (!title || !PLACEMENTS.has(placement)) {
    return NextResponse.json({ error: 'title and a valid placement are required.' }, { status: 400 });
  }
  const id = createAd({
    title,
    body: b.body?.trim() || undefined,
    imageUrl: b.imageUrl?.trim() || undefined,
    ctaLabel: b.ctaLabel?.trim() || undefined,
    linkUrl: b.linkUrl?.trim() || undefined,
    placement,
    popupDelaySecs: b.popupDelaySecs ? Number(b.popupDelaySecs) : undefined,
    popupFrequency: (b.popupFrequency as 'session' | 'always' | 'once') || undefined,
    startsAt: b.startsAt || null,
    endsAt: b.endsAt || null,
  });
  audit(admin.id, 'ad_create', `${placement}:${title}`);
  return NextResponse.json({ ok: true, id });
}
