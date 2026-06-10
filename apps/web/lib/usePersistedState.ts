'use client';

import { useEffect, useState } from 'react';

/**
 * useState that survives reloads via localStorage (JSON-serialised).
 * SSR-safe: the first render uses `initial`, then hydrates from storage —
 * so server and client markup never diverge.
 */
export function usePersistedState<T>(key: string, initial: T): [T, (next: T) => void] {
  const storageKey = `pdfshell:${key}`;
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* corrupted or unavailable storage — keep the default */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const set = (next: T) => {
    setValue(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* quota/private mode — state still works for this session */
    }
  };

  return [value, set];
}
