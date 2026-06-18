import * as React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

const VARIANTS: Record<AlertVariant, { icon: typeof Info; cls: string }> = {
  error: {
    icon: AlertCircle,
    cls: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    cls: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  },
  info: {
    icon: Info,
    cls: 'border-[var(--brand)]/40 bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] text-[var(--foreground)]',
  },
  success: {
    icon: CheckCircle2,
    cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
};

/**
 * Semantic inline message box (error/warning/info/success) with an icon and
 * dark-mode-correct tints. Replaces bare red `<p>`s and hand-rolled coloured
 * divs so every alert reads "in control" rather than "broken".
 */
export function Alert({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, cls } = VARIANTS[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-lg border p-3 text-sm', cls, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}
