import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { q, q1 } from './db';

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
  const id = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await q('INSERT INTO sessions (id, admin_id, expires_at) VALUES ($1, $2, $3)', [
    id,
    adminId,
    expires.toISOString(),
  ]);
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
  return q1<AdminUser>(
    `SELECT a.id, a.username, a.role, a.must_change_password
     FROM sessions s JOIN admins a ON a.id = s.admin_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [id],
  );
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await q('DELETE FROM sessions WHERE id = $1', [id]);
  jar.delete(COOKIE);
}

export async function audit(adminId: number | null, action: string, detail?: string): Promise<void> {
  await q('INSERT INTO audit_log (admin_id, action, detail) VALUES ($1, $2, $3)', [
    adminId,
    action,
    detail ?? null,
  ]);
}
