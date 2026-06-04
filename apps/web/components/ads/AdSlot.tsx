'use client';

import { useEffect, useState } from 'react';
import { trackAd } from '@/lib/track';

interface Ad {
  id: number;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  link_url: string | null;
}

/**
 * Non-obstructive inline ad slot for a placement (e.g. landing-banner). Renders
 * nothing if there are no active ads, so it never leaves an empty gap. Records
 * an impression when shown and a click when followed.
 */
export function AdSlot({ placement }: { placement: string }) {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/ads?placement=${placement}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && d.ads?.length) {
          const picked: Ad = d.ads[0];
          setAd(picked);
          trackAd(picked.id, 'impression');
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [placement]);

  if (!ad) return null;

  const content = (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      {ad.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.image_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{ad.title}</p>
        {ad.body && <p className="truncate text-xs text-[var(--muted-foreground)]">{ad.body}</p>}
      </div>
      {ad.cta_label && (
        <span className="shrink-0 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)]">
          {ad.cta_label}
        </span>
      )}
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Ad</span>
    </div>
  );

  return ad.link_url ? (
    <a href={ad.link_url} target="_blank" rel="noreferrer sponsored" onClick={() => trackAd(ad.id, 'click')}>
      {content}
    </a>
  ) : (
    content
  );
}
