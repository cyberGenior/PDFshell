'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tracks, per heavy asset, whether the user has agreed to its one-time download.
 *
 * Why this exists: tools like OCR (Tesseract core + per-language trained data,
 * several MB each) pull large files on first use. On metered, expensive Zambian
 * mobile data we must NOT fetch those silently — the user consents once, we
 * remember it (localStorage), and the service worker caches the bytes so it
 * never costs them twice. See references/african-context.md §2.
 */
const STORAGE_PREFIX = 'pdfshell:asset-consent:';

function keyFor(assetId: string): string {
  return `${STORAGE_PREFIX}${assetId}`;
}

function read(assetId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(keyFor(assetId)) === '1';
  } catch {
    return false;
  }
}

// useSyncExternalStore needs a stable subscribe; consent only changes via grant()
// in this tab, so we notify local subscribers through a tiny listener set.
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React hook: has the user consented to downloading this asset, and a granter. */
export function useAssetConsent(assetId: string): {
  consented: boolean;
  grant: () => void;
} {
  const consented = useSyncExternalStore(
    subscribe,
    () => read(assetId),
    () => false, // server snapshot — never consented during SSR/export
  );

  const grant = useCallback(() => {
    try {
      window.localStorage.setItem(keyFor(assetId), '1');
    } catch {
      /* storage may be unavailable (private mode); consent is then per-session */
    }
    listeners.forEach((cb) => cb());
  }, []);

  return { consented, grant };
}
