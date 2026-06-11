'use client';

import { useEffect, useState } from 'react';

/**
 * Personal, device-local usage stats. Everything stays in localStorage — this
 * is the engagement counterpart of the privacy promise: "23 files processed,
 * 41 MB saved, none of it ever left this device."
 */
export interface LocalStats {
  /** Successful results produced, across all tools. */
  files: number;
  /** Total bytes shaved off by compression-style results (never negative). */
  savedBytes: number;
  /** Most-recently-used tool slugs, newest first, deduped. */
  recentTools: string[];
}

const KEY = 'pdfshell:stats';
const EVENT = 'pdfshell:stats-changed';
const EMPTY: LocalStats = { files: 0, savedBytes: 0, recentTools: [] };

function read(): LocalStats {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<LocalStats>;
    return {
      files: typeof parsed.files === 'number' ? parsed.files : 0,
      savedBytes: typeof parsed.savedBytes === 'number' ? parsed.savedBytes : 0,
      recentTools: Array.isArray(parsed.recentTools) ? parsed.recentTools.filter((t) => typeof t === 'string') : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(stats: LocalStats): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage unavailable — stats are best-effort */
  }
}

/** Record one successful result. Pass sizes to credit "bytes saved". */
export function recordResult(tool: string, originalSize?: number, outputSize?: number): void {
  if (typeof window === 'undefined') return;
  const s = read();
  const saved =
    originalSize !== undefined && outputSize !== undefined && outputSize < originalSize
      ? originalSize - outputSize
      : 0;
  write({ ...s, files: s.files + 1, savedBytes: s.savedBytes + saved });
}

/** Record a visit to a tool page (drives the "recently used" row). */
export function recordToolVisit(slug: string): void {
  if (typeof window === 'undefined') return;
  const s = read();
  const recentTools = [slug, ...s.recentTools.filter((t) => t !== slug)].slice(0, 4);
  // Skip the write (and re-render event) when nothing actually changed.
  if (recentTools.join() === s.recentTools.join()) return;
  write({ ...s, recentTools });
}

/**
 * Live view of the local stats. SSR-safe: first render is the empty state,
 * then it hydrates and tracks changes from any component on the page.
 */
export function useLocalStats(): LocalStats {
  const [stats, setStats] = useState<LocalStats>(EMPTY);

  useEffect(() => {
    const update = () => setStats(read());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return stats;
}
