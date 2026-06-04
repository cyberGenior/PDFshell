import { NextResponse } from 'next/server';
import { getSessionAdmin, audit } from '@/lib/server/auth';
import { setAdEnabled, deleteAd } from '@/lib/server/ads';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, id } = (await req.json().catch(() => ({}))) as { action?: string; id?: number };
  if (!id || !action) return NextResponse.json({ error: 'action and id required.' }, { status: 400 });

  switch (action) {
    case 'enable':
      await setAdEnabled(id, true);
      break;
    case 'disable':
      await setAdEnabled(id, false);
      break;
    case 'delete':
      await deleteAd(id);
      break;
    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
  await audit(admin.id, `ad_${action}`, String(id));
  return NextResponse.json({ ok: true });
}
