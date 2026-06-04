import 'server-only';
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto';
import { q, q1 } from './db';

/**
 * Encrypt admin-entered secrets (AI API keys) at rest with AES-256-GCM. The
 * master secret comes from PDFSHELL_SECRET; if unset we generate one once and
 * persist it in `settings` so encrypted values remain decryptable across
 * restarts. Set PDFSHELL_SECRET in production for a stable, external key.
 */
let cachedSecret: string | null = null;

async function masterSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  if (process.env.PDFSHELL_SECRET) {
    cachedSecret = process.env.PDFSHELL_SECRET;
    return cachedSecret;
  }
  const row = await q1<{ value: string }>("SELECT value FROM settings WHERE key = 'enc_secret'");
  if (row?.value) {
    cachedSecret = row.value;
    return cachedSecret;
  }
  const generated = randomBytes(32).toString('hex');
  // ON CONFLICT guards a race between concurrent first-writers.
  await q(
    "INSERT INTO settings (key, value) VALUES ('enc_secret', $1) ON CONFLICT (key) DO NOTHING",
    [generated],
  );
  const after = await q1<{ value: string }>("SELECT value FROM settings WHERE key = 'enc_secret'");
  cachedSecret = after?.value ?? generated;
  return cachedSecret;
}

async function key(): Promise<Buffer> {
  return scryptSync(await masterSecret(), 'pdfshell-aes-v1', 32);
}

export async function encrypt(plain: string): Promise<string> {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', await key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export async function decrypt(blob: string): Promise<string> {
  const [ivB64, tagB64, dataB64] = blob.split(':');
  if (!ivB64 || !tagB64 || !dataB64) return '';
  const decipher = createDecipheriv('aes-256-gcm', await key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

/** Show only the last 4 characters of a secret for display. */
export function maskKey(plain: string): string {
  if (!plain) return '';
  return plain.length <= 4 ? '••••' : `••••${plain.slice(-4)}`;
}
