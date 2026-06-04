import 'server-only';
import { Pool, type PoolClient } from 'pg';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Postgres-backed store for the admin, analytics, ads, AI models and sessions.
 * Replaces the previous embedded SQLite so the app runs with no writable disk —
 * deployable on Vercel/Render/etc. Point DATABASE_URL at any Postgres (Render,
 * Neon, Vercel Postgres, Supabase, local docker…).
 */
const DEFAULT_ADMIN_USER = process.env.PDFSHELL_ADMIN_USER ?? 'admin';
const DEFAULT_ADMIN_PASS = process.env.PDFSHELL_ADMIN_PASS ?? 'ChangeMe!PDFShell';

// Reuse one pool + one migration across hot reloads and serverless invocations.
const g = globalThis as unknown as { __pdfshellPool?: Pool; __pdfshellReady?: Promise<void> };

function sslOption(cs: string): false | { rejectUnauthorized: boolean } {
  const mode = (process.env.DATABASE_SSL ?? '').toLowerCase();
  if (mode === 'disable') return false;
  if (mode === 'require') return { rejectUnauthorized: false };
  // Auto: local connections plaintext, everything else over SSL (hosted PG).
  return /localhost|127\.0\.0\.1/.test(cs) ? false : { rejectUnauthorized: false };
}

function pool(): Pool {
  if (!g.__pdfshellPool) {
    const cs = process.env.DATABASE_URL;
    if (!cs) {
      throw new Error(
        'DATABASE_URL is not set — PDFShell admin/analytics needs a Postgres database.',
      );
    }
    g.__pdfshellPool = new Pool({
      connectionString: cs,
      ssl: sslOption(cs),
      max: Number(process.env.PGPOOL_MAX ?? 5),
    });
  }
  return g.__pdfshellPool;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/** Constant-time password check against a stored scrypt hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const hash = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

async function migrate(): Promise<void> {
  const p = pool();
  // node-postgres runs multiple statements in one parameter-less query.
  await p.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'super',
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES admins(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    -- Anonymous-or-identified usage events (full tracking enabled).
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT now(),
      type TEXT NOT NULL,           -- page_view | tool_used | conversion | error | ad_impression | ad_click
      name TEXT,                    -- path or tool slug or ad id
      visitor_id TEXT,              -- persistent visitor cookie
      session_id TEXT,              -- per-visit
      ip TEXT,
      country TEXT,
      device TEXT,                  -- mobile | tablet | desktop
      browser TEXT,
      referrer TEXT,
      meta TEXT                     -- JSON blob for extra fields
    );
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

    CREATE TABLE IF NOT EXISTS ai_models (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      provider TEXT NOT NULL,       -- ollama | openai | anthropic | custom
      base_url TEXT NOT NULL,
      model TEXT NOT NULL,
      api_key_enc TEXT,             -- encrypted at rest
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ads (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT,
      image_url TEXT,
      cta_label TEXT,
      link_url TEXT,
      placement TEXT NOT NULL DEFAULT 'landing-banner', -- landing-banner | landing-grid | sidebar | popup
      popup_delay_secs INTEGER NOT NULL DEFAULT 5,
      popup_frequency TEXT NOT NULL DEFAULT 'session',  -- session | always | once
      enabled INTEGER NOT NULL DEFAULT 1,
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT now(),
      admin_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT
    );
  `);

  // Seed the default admin once.
  const { rows } = await p.query<{ c: number }>('SELECT COUNT(*)::int AS c FROM admins');
  if (rows[0]!.c === 0) {
    await p.query(
      'INSERT INTO admins (username, password_hash, role, must_change_password) VALUES ($1, $2, $3, 1)',
      [DEFAULT_ADMIN_USER, hashPassword(DEFAULT_ADMIN_PASS), 'super'],
    );
    console.log(
      `[pdfshell] Seeded default admin "${DEFAULT_ADMIN_USER}" — change the password on first login.`,
    );
  }
}

/** Run migrations exactly once per process before the first query. */
function ready(): Promise<void> {
  if (!g.__pdfshellReady) g.__pdfshellReady = migrate();
  return g.__pdfshellReady;
}

/** Run a query and return all rows. */
export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  const res = await pool().query(text, params);
  return res.rows as T[];
}

/** Run a query and return the first row, or null. */
export async function q1<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

/** Run several statements atomically in a transaction. */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ready();
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export { hashPassword };
