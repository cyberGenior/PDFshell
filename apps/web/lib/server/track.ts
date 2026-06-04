import 'server-only';
import { q } from './db';

export interface IncomingEvent {
  type: string;
  name?: string;
  visitorId?: string;
  sessionId?: string;
  referrer?: string;
  meta?: unknown;
}

/** Coarse device class from a User-Agent string. */
function deviceOf(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Best-effort browser family from a User-Agent string. */
function browserOf(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}

function clientIp(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? null;
}

/** Country from a CDN header if present (Cloudflare/Vercel); else null. */
function countryOf(headers: Headers): string | null {
  return (
    headers.get('cf-ipcountry') ??
    headers.get('x-vercel-ip-country') ??
    headers.get('x-geo-country') ??
    null
  );
}

const VALID = new Set([
  'page_view',
  'tool_used',
  'conversion',
  'error',
  'ad_impression',
  'ad_click',
]);

/** Persist one analytics event, enriching it with request-derived fields. */
export async function recordEvent(ev: IncomingEvent, headers: Headers): Promise<void> {
  if (!VALID.has(ev.type)) return;
  const ua = headers.get('user-agent') ?? '';
  await q(
    `INSERT INTO events
       (type, name, visitor_id, session_id, ip, country, device, browser, referrer, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      ev.type,
      ev.name ?? null,
      ev.visitorId ?? null,
      ev.sessionId ?? null,
      clientIp(headers),
      countryOf(headers),
      deviceOf(ua),
      browserOf(ua),
      (ev.referrer ?? headers.get('referer') ?? '').slice(0, 300) || null,
      ev.meta != null ? JSON.stringify(ev.meta).slice(0, 1000) : null,
    ],
  );
}
