'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  /** Short label. Omit and pass `children` for fully custom content. */
  label?: ReactNode;
  /** Optional secondary line under the label. */
  description?: ReactNode;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Compact padding for dense grids (e.g. the 9-point position picker). */
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * A selectable, accessible option button — the bordered "pick one" pattern used
 * across tools (compress methods, watermark/page-number positions, protect
 * toggles). Extracted so every picker looks and behaves the same: brand-tinted
 * when selected, hover surface, real `aria-pressed`, keyboard focus ring.
 */
export function OptionCard({
  selected,
  onSelect,
  label,
  description,
  icon,
  compact = false,
  disabled = false,
  className,
  children,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        'rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50',
        compact ? 'px-2 py-2 text-xs' : 'px-3 py-2.5 text-sm',
        selected
          ? 'border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)]'
          : 'border-[var(--border)] hover:bg-[var(--surface-2)]',
        className,
      )}
    >
      {children ?? (
        <span className="flex items-start gap-2">
          {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
          <span className="min-w-0">
            <span className={cn('block', selected && 'font-medium')}>{label}</span>
            {description && (
              <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">{description}</span>
            )}
          </span>
        </span>
      )}
    </button>
  );
}
