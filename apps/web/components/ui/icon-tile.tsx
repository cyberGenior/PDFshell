import * as React from 'react';
import { cn } from '@/lib/utils';

const sizes = {
  sm: 'size-8 rounded-lg [&_svg]:size-4',
  md: 'size-10 rounded-xl [&_svg]:size-[18px]',
  lg: 'size-12 rounded-xl [&_svg]:size-5',
} as const;

interface IconTileProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof sizes;
  /** Active tiles use the brand gradient (like the reference's Inbox icon). */
  active?: boolean;
}

/**
 * The rounded, bordered icon container used throughout the reference UI — for
 * sidebar items, tool headers, etc. Active state swaps the subtle outline for
 * the brand gradient so the current context reads instantly.
 */
export function IconTile({ size = 'md', active = false, className, ...props }: IconTileProps) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center transition-colors',
        sizes[size],
        active
          ? 'gradient-brand text-white shadow-md shadow-[color-mix(in_oklch,var(--brand)_35%,transparent)]'
          : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted-foreground)]',
        className,
      )}
      {...props}
    />
  );
}
