import 'server-only';
import { getDb } from './db';

export type Placement = 'landing-banner' | 'landing-grid' | 'sidebar' | 'popup';

export interface AdInput {
  title: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  linkUrl?: string;
  placement: Placement;
  popupDelaySecs?: number;
  popupFrequency?: 'session' | 'always' | 'once';
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface PublicAd {
  id: number;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  link_url: string | null;
  placement: string;
  popup_delay_secs: number;
  popup_frequency: string;
}

export interface AdWithStats extends PublicAd {
  enabled: number;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
}

export function createAd(a: AdInput): number {
  const info = getDb()
    .prepare(
      `INSERT INTO ads
        (title, body, image_url, cta_label, link_url, placement, popup_delay_secs, popup_frequency, starts_at, ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      a.title,
      a.body ?? null,
      a.imageUrl ?? null,
      a.ctaLabel ?? null,
      a.linkUrl ?? null,
      a.placement,
      a.popupDelaySecs ?? 5,
      a.popupFrequency ?? 'session',
      a.startsAt ?? null,
      a.endsAt ?? null,
    );
  return Number(info.lastInsertRowid);
}

export function setAdEnabled(id: number, enabled: boolean): void {
  getDb().prepare('UPDATE ads SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
}

export function deleteAd(id: number): void {
  getDb().prepare('DELETE FROM ads WHERE id = ?').run(id);
}

/** Active ads for a placement: enabled and within their schedule window. */
export function activeAdsByPlacement(placement: string): PublicAd[] {
  return getDb()
    .prepare(
      `SELECT id, title, body, image_url, cta_label, link_url, placement, popup_delay_secs, popup_frequency
       FROM ads
       WHERE enabled = 1 AND placement = ?
         AND (starts_at IS NULL OR datetime(starts_at) <= datetime('now'))
         AND (ends_at   IS NULL OR datetime(ends_at)   >= datetime('now'))
       ORDER BY id DESC`,
    )
    .all(placement) as unknown as PublicAd[];
}

export function listAdsWithStats(): AdWithStats[] {
  return getDb()
    .prepare(
      `SELECT a.*,
        (SELECT COUNT(*) FROM events e WHERE e.type='ad_impression' AND e.name = CAST(a.id AS TEXT)) AS impressions,
        (SELECT COUNT(*) FROM events e WHERE e.type='ad_click'      AND e.name = CAST(a.id AS TEXT)) AS clicks
       FROM ads a ORDER BY a.id DESC`,
    )
    .all() as unknown as AdWithStats[];
}
