'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore, type ToastItem } from '@/lib/useToast';

/**
 * Global toast container. Mounted once in the root layout. Bottom-centre on
 * mobile (thumb reach), bottom-right on desktop. Accessible: each toast is a
 * polite/assertive live region; the whole region is keyboard-dismissable.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const STYLES: Record<ToastItem['kind'], { icon: typeof CheckCircle2; tint: string }> = {
  success: { icon: CheckCircle2, tint: 'oklch(0.65 0.15 150)' },
  error: { icon: AlertCircle, tint: 'oklch(0.62 0.21 25)' },
  info: { icon: Info, tint: 'var(--brand)' },
};

function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { icon: Icon, tint } = STYLES[toast.kind];

  useEffect(() => {
    const t = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(t);
  }, [toast.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className="card-shadow pointer-events-auto flex w-[min(24rem,90vw)] items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
    >
      <Icon className="mt-0.5 size-5 shrink-0" style={{ color: tint }} />
      <p className="flex-1 text-sm leading-snug" style={{ color: 'var(--foreground)' }}>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 rounded-md p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}
