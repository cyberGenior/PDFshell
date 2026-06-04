import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Embedded SQLite via Node's built-in driver (no native build step — important
 * for the single all-in-one image). The file persists across restarts; mount
 * its directory as a volume in production to retain data.
 */
const DB_PATH =
  process.env.PDFSHELL_DB_PATH ?? path.join(process.cwd(), 'data', 'pdfshell.db');

const DEFAULT_ADMIN_USER = process.env.PDFSHELL_ADMIN_USER ?? 'admin';
const DEFAULT_ADMIN_PASS = process.env.PDFSHELL_ADMIN_PASS ?? 'ChangeMe!PDFShell';

// Reuse one connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { __pdfshellDb?: DatabaseSync };

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

function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'super',
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES admins(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    -- Anonymous-or-identified usage events (full tracking enabled).
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL DEFAULT (datetime('now')),
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      provider TEXT NOT NULL,       -- ollama | openai | anthropic | custom
      base_url TEXT NOT NULL,
      model TEXT NOT NULL,
      api_key_enc TEXT,             -- encrypted at rest
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT,
      image_url TEXT,
      cta_label TEXT,
      link_url TEXT,
      placement TEXT NOT NULL DEFAULT 'landing-banner', -- landing-banner | landing-grid | sidebar | popup
      popup_delay_secs INTEGER NOT NULL DEFAULT 5,
      popup_frequency TEXT NOT NULL DEFAULT 'session',  -- session | always | once
      enabled INTEGER NOT NULL DEFAULT 1,
      starts_at TEXT,
      ends_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL DEFAULT (datetime('now')),
      admin_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT
    );
  `);

  // Seed the default admin once.
  const count = db.prepare('SELECT COUNT(*) AS c FROM admins').get() as { c: number };
  if (count.c === 0) {
    db.prepare(
      'INSERT INTO admins (username, password_hash, role, must_change_password) VALUES (?, ?, ?, 1)',
    ).run(DEFAULT_ADMIN_USER, hashPassword(DEFAULT_ADMIN_PASS), 'super');
    console.log(
      `[pdfshell] Seeded default admin "${DEFAULT_ADMIN_USER}" — change the password on first login.`,
    );
  } else if (process.env.PDFSHELL_ADMIN_PASS) {
    // Self-heal: if PDFSHELL_ADMIN_PASS is set and the seeded admin hasn't
    // changed their password in-panel yet (must_change_password = 1), keep it in
    // sync with the env. This lets you (re)set the admin password by setting the
    // env var and restarting — no shell needed. Once you change it in the panel
    // (must_change_password → 0), the env no longer overrides it.
    const row = db
      .prepare('SELECT id, must_change_password FROM admins WHERE username = ?')
      .get(DEFAULT_ADMIN_USER) as { id: number; must_change_password: number } | undefined;
    if (row && row.must_change_password === 1) {
      db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(
        hashPassword(DEFAULT_ADMIN_PASS),
        row.id,
      );
      console.log(`[pdfshell] Synced admin "${DEFAULT_ADMIN_USER}" password from PDFSHELL_ADMIN_PASS.`);
    }
  }
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__pdfshellDb) {
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    migrate(db);
    globalForDb.__pdfshellDb = db;
  }
  return globalForDb.__pdfshellDb;
}

export { hashPassword };
