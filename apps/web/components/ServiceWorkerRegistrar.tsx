'use client';

import { useEffect } from 'react';

/**
 * Registers the asset-caching service worker (see public/sw.js). Client-only and
 * production-only — in dev we don't want a SW intercepting anything. Rendered
 * once from the root layout.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failures are non-fatal: the app still works, just without
      // the offline asset cache.
    });
  }, []);

  return null;
}
