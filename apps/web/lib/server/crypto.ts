import 'server-only';
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto';
import { getDb } from './db';

/**
 * Encrypt admin-entered secrets (AI API keys) at rest with AES-256-GCM. The
 * master secret comes from PDFSHELL_SECRET; if unset we generate one once and
 * persist it in `settings` so encrypted values remain decryptable across
 * restarts. Set PDFSHELL_SECRET in production for a stable, external key.
 */
function masterSecret(): string {
  if (process.env.PDFSHELL_SECRET) return process.env.PDFSHELL_SECRET;
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'enc_secret'").get() as
    | { value: string }
    | undefined;
  if (row?.value) return row.value;
  const generated = randomBytes(32).toString('hex');
  db.prepare("INSERT INTO settings (key, value) VALUES ('enc_secret', ?)").run(generated);
  return generated;
}

function key(): Buffer {
  return scryptSync(masterSecret(), 'pdfshell-aes-v1', 32);
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decrypt(blob: string): string {
  const [ivB64, tagB64, dataB64] = blob.split(':');
  if (!ivB64 || !tagB64 || !dataB64) return '';
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

/** Show only the last 4 characters of a secret for display. */
export function maskKey(plain: string): string {
  if (!plain) return '';
  return plain.length <= 4 ? '••••' : `••••${plain.slice(-4)}`;
}
