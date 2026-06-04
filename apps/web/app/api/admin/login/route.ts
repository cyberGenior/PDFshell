import { NextResponse } from 'next/server';
import { getDb, verifyPassword } from '@/lib/server/db';
import { createSession, audit } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const username = (body.username ?? '').trim();
  const password = body.password ?? '';
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const admin = getDb()
    .prepare('SELECT id, password_hash FROM admins WHERE username = ?')
    .get(username) as { id: number; password_hash: string } | undefined;

  // Same response whether the user exists or not (avoid user enumeration).
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return NextResponse.json({ error: 'Incorrect username or password.' }, { status: 401 });
  }

  await createSession(admin.id);
  audit(admin.id, 'login', username);
  return NextResponse.json({ ok: true });
}
