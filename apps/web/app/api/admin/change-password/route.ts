import { NextResponse } from 'next/server';
import { getDb, verifyPassword, hashPassword } from '@/lib/server/db';
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

  const db = getDb();
  const row = db.prepare('SELECT password_hash FROM admins WHERE id = ?').get(admin.id) as
    | { password_hash: string }
    | undefined;
  if (!row || !verifyPassword(current, row.password_hash)) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  db.prepare('UPDATE admins SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(
    hashPassword(next),
    admin.id,
  );
  audit(admin.id, 'change_password');
  return NextResponse.json({ ok: true });
}
