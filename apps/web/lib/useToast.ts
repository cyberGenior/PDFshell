'use client';

import { create } from 'zustand';

/**
 * App-wide toast feedback. A tiny zustand store (same pattern as lib/handoff.ts)
 * so any component — or a plain module — can fire a toast without prop-drilling.
 * The <Toaster /> in the root layout renders the queue.
 *
 *   import { toast } from '@/lib/useToast';
 *   toast.success('Downloaded');
 *   toast.error('Conversion failed.');
 */
export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  /** Auto-dismiss delay in ms (the Toaster also lets the user dismiss early). */
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string, duration?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message, duration = kind === 'error' ? 6000 : 3500) =>
    set((s) => ({ toasts: [...s.toasts, { id: ++nextId, kind, message, duration }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper for use outside React (event handlers, catch blocks). */
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().push('success', message, duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().push('error', message, duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().push('info', message, duration),
};
