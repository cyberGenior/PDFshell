import { NextResponse } from 'next/server';
import { q, q1, verifyPassword, hashPassword } from '@/lib/server/db';
import { getSessionAdmin, audit } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { current, next } = (await req.json().catch(() => ({}))) as {
    current?: string;
    next?: string;
  };
  if (!current || !next) return NextResponse.json({ error: 'Both fields are required.' }, { status: 400 });
  if (next.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });

  const row = await q1<{ password_hash: string }>(
    'SELECT password_hash FROM admins WHERE id = $1',
    [admin.id],
  );
  if (!row || !verifyPassword(current, row.password_hash)) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  await q('UPDATE admins SET password_hash = $1, must_change_password = 0 WHERE id = $2', [
    hashPassword(next),
    admin.id,
  ]);
  await audit(admin.id, 'change_password');
  return NextResponse.json({ ok: true });
}
