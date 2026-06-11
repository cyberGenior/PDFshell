'use client';

import { useSyncExternalStore } from 'react';

/**
 * One-click workflows: a named, ordered chain of tools. Starting a flow routes
 * you to the first tool; producing a result there offers "Continue to <next>",
 * which hands the file over (in memory) and advances. State lives in
 * sessionStorage so it survives navigation but never outlives the tab.
 */
export interface Flow {
  slug: string;
  name: string;
  description: string;
  /** Tool slugs, in order. */
  steps: string[];
}

export const FLOWS: Flow[] = [
  {
    slug: 'scan-cleanup',
    name: 'Scan & clean up',
    description: 'Photograph your pages, then shrink the PDF so it’s easy to email or share.',
    steps: ['scan', 'compress'],
  },
  {
    slug: 'scan-to-text',
    name: 'Scan to searchable PDF',
    description: 'Photograph your pages, then OCR them into selectable, searchable text.',
    steps: ['scan', 'ocr'],
  },
  {
    slug: 'merge-compress',
    name: 'Combine & compress',
    description: 'Merge several PDFs into one, then compress the combined file.',
    steps: ['merge', 'compress'],
  },
];

export function getFlow(slug: string): Flow | undefined {
  return FLOWS.find((f) => f.slug === slug);
}

const KEY = 'pdfshell:flow';

interface FlowState {
  slug: string;
  step: number;
}

const listeners = new Set<() => void>();
let snapshot: FlowState | null = null;
let hydrated = false;

function read(): FlowState | null {
  if (typeof window === 'undefined') return null;
  if (!hydrated) {
    try {
      const raw = sessionStorage.getItem(KEY);
      snapshot = raw ? (JSON.parse(raw) as FlowState) : null;
    } catch {
      snapshot = null;
    }
    hydrated = true;
  }
  return snapshot;
}

function write(next: FlowState | null) {
  snapshot = next;
  hydrated = true;
  try {
    if (next) sessionStorage.setItem(KEY, JSON.stringify(next));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked — keep the in-memory snapshot */
  }
  listeners.forEach((l) => l());
}

export function startFlow(slug: string) {
  if (getFlow(slug)) write({ slug, step: 0 });
}

/** Advance to the next step; clears the flow if that was the last step. */
export function advanceFlow() {
  const cur = read();
  if (!cur) return;
  const flow = getFlow(cur.slug);
  if (!flow) return write(null);
  const next = cur.step + 1;
  if (next >= flow.steps.length) write(null);
  else write({ slug: cur.slug, step: next });
}

export function exitFlow() {
  write(null);
}

/** Reactive accessor: the active flow and current step, or null. */
export function useActiveFlow(): { flow: Flow; step: number } | null {
  const state = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
  if (!state) return null;
  const flow = getFlow(state.slug);
  return flow ? { flow, step: state.step } : null;
}
