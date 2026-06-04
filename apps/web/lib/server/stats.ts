import 'server-only';
import { getDb } from './db';

export interface Bucket {
  label: string;
  value: number;
}
export interface EventRow {
  ts: string;
  type: string;
  name: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  ip: string | null;
}

/** Event counts per day for the last `days` days (zero-filled). */
export function dailyCounts(days = 14): Bucket[] {
  const rows = getDb()
    .prepare(
      `SELECT date(ts) d, COUNT(*) c FROM events
       WHERE ts >= datetime('now', ?) GROUP BY date(ts)`,
    )
    .all(`-${days} days`) as unknown as { d: string; c: number }[];
  const map = new Map(rows.map((r) => [r.d, r.c]));
  const out: Bucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    out.push({ label: d.slice(5), value: map.get(d) ?? 0 });
  }
  return out;
}

function group(sql: string): Bucket[] {
  const rows = getDb().prepare(sql).all() as unknown as { label: string | null; value: number }[];
  return rows.map((r) => ({ label: r.label ?? '—', value: r.value }));
}

export const countsByType = () =>
  group('SELECT type AS label, COUNT(*) AS value FROM events GROUP BY type ORDER BY value DESC');

export const topTools = (limit = 6) =>
  group(
    `SELECT name AS label, COUNT(*) AS value FROM events
     WHERE type = 'tool_used' AND name IS NOT NULL GROUP BY name ORDER BY value DESC LIMIT ${limit}`,
  );

export const deviceSplit = () =>
  group(
    "SELECT COALESCE(device,'—') AS label, COUNT(*) AS value FROM events WHERE type='page_view' GROUP BY device ORDER BY value DESC",
  );

export const topCountries = (limit = 6) =>
  group(
    `SELECT COALESCE(country,'Unknown') AS label, COUNT(*) AS value FROM events
     GROUP BY country ORDER BY value DESC LIMIT ${limit}`,
  );

export function recentEvents(limit = 50): EventRow[] {
  return getDb()
    .prepare(
      `SELECT ts, type, name, country, device, browser, ip FROM events
       ORDER BY id DESC LIMIT ${limit}`,
    )
    .all() as unknown as EventRow[];
}
