'use client';

// Lightweight client-side analytics beacon. A persistent visitor id (localStorage)
// and a per-visit session id (sessionStorage) accompany every event.

function rid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function visitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let v = localStorage.getItem('pdfshell_vid');
    if (!v) {
      v = rid();
      localStorage.setItem('pdfshell_vid', v);
    }
    return v;
  } catch {
    return '';
  }
}

function sessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let s = sessionStorage.getItem('pdfshell_sid');
    if (!s) {
      s = rid();
      sessionStorage.setItem('pdfshell_sid', s);
    }
    return s;
  } catch {
    return '';
  }
}

export type EventType =
  | 'page_view'
  | 'tool_used'
  | 'conversion'
  | 'error'
  | 'ad_impression'
  | 'ad_click';

/** Fire-and-forget analytics event. */
export function track(type: EventType, name?: string, meta?: unknown): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({
    type,
    name,
    meta,
    visitorId: visitorId(),
    sessionId: sessionId(),
    referrer: document.referrer || undefined,
  });
  try {
    // sendBeacon survives navigation; fall back to fetch.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
    }
  } catch {
    /* ignore */
  }
}

/** Record an ad impression or click (ad id as the event name). */
export function trackAd(adId: number, kind: 'impression' | 'click'): void {
  track(kind === 'click' ? 'ad_click' : 'ad_impression', String(adId));
}
