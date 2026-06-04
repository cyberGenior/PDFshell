import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { getDb } from './db';

const COOKIE = 'pdfshell_admin';
const SESSION_DAYS = 7;

export interface AdminUser {
  id: number;
  username: string;
  role: string;
  must_change_password: number;
}

/** Create a session row + set the httpOnly cookie. */
export async function createSession(adminId: number): Promise<void> {
  const db = getDb();
  const id = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  db.prepare("INSERT INTO sessions (id, admin_id, expires_at) VALUES (?, ?, ?)").run(
    id,
    adminId,
    expires.toISOString(),
  );
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });
}

/** Resolve the currently logged-in admin from the session cookie, or null. */
export async function getSessionAdmin(): Promise<AdminUser | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT a.id, a.username, a.role, a.must_change_password
       FROM sessions s JOIN admins a ON a.id = s.admin_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`,
    )
    .get(id) as AdminUser | undefined;
  return row ?? null;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
  jar.delete(COOKIE);
}

export function audit(adminId: number | null, action: string, detail?: string): void {
  getDb().prepare('INSERT INTO audit_log (admin_id, action, detail) VALUES (?, ?, ?)').run(
    adminId,
    action,
    detail ?? null,
  );
}
