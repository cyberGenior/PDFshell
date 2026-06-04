import { NextResponse } from 'next/server';
import { getSessionAdmin, audit } from '@/lib/server/auth';
import { activateModel, deleteModel, testModel } from '@/lib/server/aiModels';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, id } = (await req.json().catch(() => ({}))) as { action?: string; id?: number };
  if (!id || !action) return NextResponse.json({ error: 'action and id required.' }, { status: 400 });

  switch (action) {
    case 'activate':
      await activateModel(id);
      await audit(admin.id, 'ai_model_activate', String(id));
      return NextResponse.json({ ok: true });
    case 'delete':
      await deleteModel(id);
      await audit(admin.id, 'ai_model_delete', String(id));
      return NextResponse.json({ ok: true });
    case 'test':
      return NextResponse.json(await testModel(id));
    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
}
