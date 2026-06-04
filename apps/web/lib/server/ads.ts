import 'server-only';
import { q, q1 } from './db';

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

export async function createAd(a: AdInput): Promise<number> {
  const row = await q1<{ id: number }>(
    `INSERT INTO ads
       (title, body, image_url, cta_label, link_url, placement, popup_delay_secs, popup_frequency, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
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
    ],
  );
  return row!.id;
}

export async function setAdEnabled(id: number, enabled: boolean): Promise<void> {
  await q('UPDATE ads SET enabled = $1 WHERE id = $2', [enabled ? 1 : 0, id]);
}

export async function deleteAd(id: number): Promise<void> {
  await q('DELETE FROM ads WHERE id = $1', [id]);
}

/** Active ads for a placement: enabled and within their schedule window. */
export async function activeAdsByPlacement(placement: string): Promise<PublicAd[]> {
  return q<PublicAd>(
    `SELECT id, title, body, image_url, cta_label, link_url, placement, popup_delay_secs, popup_frequency
     FROM ads
     WHERE enabled = 1 AND placement = $1
       AND (starts_at IS NULL OR starts_at <= now())
       AND (ends_at   IS NULL OR ends_at   >= now())
     ORDER BY id DESC`,
    [placement],
  );
}

export async function listAdsWithStats(): Promise<AdWithStats[]> {
  return q<AdWithStats>(
    `SELECT a.id, a.title, a.body, a.image_url, a.cta_label, a.link_url, a.placement,
            a.popup_delay_secs, a.popup_frequency, a.enabled,
            a.starts_at::text AS starts_at, a.ends_at::text AS ends_at,
        (SELECT COUNT(*)::int FROM events e WHERE e.type='ad_impression' AND e.name = a.id::text) AS impressions,
        (SELECT COUNT(*)::int FROM events e WHERE e.type='ad_click'      AND e.name = a.id::text) AS clicks
     FROM ads a ORDER BY a.id DESC`,
  );
}
