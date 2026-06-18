import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Themed text-style input (text/password/number/email/search). Consistent height,
 * border, subtle focus fill + ring — so every form field across the tools looks
 * and behaves the same instead of hand-rolled inline styles.
 */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm',
        'transition-colors placeholder:text-[var(--muted-foreground)]',
        'focus-visible:border-[var(--brand)] focus-visible:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--ring)_45%,transparent)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-red-500',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
