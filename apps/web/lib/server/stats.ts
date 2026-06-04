import 'server-only';
import { q } from './db';

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
export async function dailyCounts(days = 14): Promise<Bucket[]> {
  const rows = await q<{ d: string; c: number }>(
    `SELECT to_char(ts, 'YYYY-MM-DD') AS d, COUNT(*)::int AS c FROM events
     WHERE ts >= now() - ($1 || ' days')::interval
     GROUP BY to_char(ts, 'YYYY-MM-DD')`,
    [days],
  );
  const map = new Map(rows.map((r) => [r.d, r.c]));
  const out: Bucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    out.push({ label: d.slice(5), value: map.get(d) ?? 0 });
  }
  return out;
}

async function group(sql: string): Promise<Bucket[]> {
  const rows = await q<{ label: string | null; value: number }>(sql);
  return rows.map((r) => ({ label: r.label ?? '—', value: Number(r.value) }));
}

export const countsByType = () =>
  group('SELECT type AS label, COUNT(*)::int AS value FROM events GROUP BY type ORDER BY value DESC');

export const topTools = (limit = 6) =>
  group(
    `SELECT name AS label, COUNT(*)::int AS value FROM events
     WHERE type = 'tool_used' AND name IS NOT NULL GROUP BY name ORDER BY value DESC LIMIT ${limit}`,
  );

export const deviceSplit = () =>
  group(
    "SELECT COALESCE(device,'—') AS label, COUNT(*)::int AS value FROM events WHERE type='page_view' GROUP BY device ORDER BY value DESC",
  );

export const topCountries = (limit = 6) =>
  group(
    `SELECT COALESCE(country,'Unknown') AS label, COUNT(*)::int AS value FROM events
     GROUP BY country ORDER BY value DESC LIMIT ${limit}`,
  );

export async function recentEvents(limit = 50): Promise<EventRow[]> {
  return q<EventRow>(
    `SELECT to_char(ts, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ts, type, name, country, device, browser, ip
     FROM events ORDER BY id DESC LIMIT ${limit}`,
  );
}
