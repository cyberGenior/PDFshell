'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { trackAd } from '@/lib/track';

interface Ad {
  id: number;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  link_url: string | null;
  popup_delay_secs: number;
  popup_frequency: string;
}

const seenKey = (id: number) => `pdfshell_ad_${id}`;

/** Whether this popup may show, given its frequency cap. */
function allowed(ad: Ad): boolean {
  try {
    if (ad.popup_frequency === 'always') return true;
    if (ad.popup_frequency === 'once') return !localStorage.getItem(seenKey(ad.id));
    // 'session'
    return !sessionStorage.getItem(seenKey(ad.id));
  } catch {
    return true;
  }
}

function remember(ad: Ad) {
  try {
    if (ad.popup_frequency === 'once') localStorage.setItem(seenKey(ad.id), '1');
    else if (ad.popup_frequency === 'session') sessionStorage.setItem(seenKey(ad.id), '1');
  } catch {
    /* ignore */
  }
}

/**
 * Timed popup ad: appears `popup_delay_secs` after load if the admin created a
 * 'popup' ad and the frequency cap allows. Dismissible; centred and modal but
 * easy to close so it doesn't trap the user.
 */
export function AdPopup() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    fetch('/api/ads?placement=popup')
      .then((r) => r.json())
      .then((d) => {
        const candidate: Ad | undefined = d.ads?.[0];
        if (!candidate || !allowed(candidate)) return;
        setAd(candidate);
        timer = setTimeout(() => {
          setOpen(true);
          remember(candidate);
          trackAd(candidate.id, 'impression');
        }, Math.max(0, candidate.popup_delay_secs) * 1000);
      })
      .catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {open && ad && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="card-shadow relative w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"
            initial={{ scale: 0.92, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/30 text-white hover:bg-black/50"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            {ad.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.image_url} alt="" className="h-40 w-full object-cover" />
            )}
            <div className="p-5">
              <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Sponsored</span>
              <h3 className="mt-1 font-serif text-xl font-medium">{ad.title}</h3>
              {ad.body && <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{ad.body}</p>}
              {ad.link_url && (
                <a
                  href={ad.link_url}
                  target="_blank"
                  rel="noreferrer sponsored"
                  onClick={() => { trackAd(ad.id, 'click'); setOpen(false); }}
                  className="mt-4 inline-flex rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
                >
                  {ad.cta_label || 'Learn more'}
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
