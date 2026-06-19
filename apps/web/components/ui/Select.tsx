import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Themed dropdown. Deliberately a *styled native* `<select>` (appearance-none +
 * custom chevron), not a JS listbox: on the mid/low-end Android phones we target,
 * the OS-native picker is faster, more accessible, and more familiar than any
 * custom popover — so this is both the premium and the pragmatic choice.
 */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative inline-flex w-fit">
      <select
        ref={ref}
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] pl-3 pr-9 text-sm',
          'transition-colors focus-visible:border-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--ring)_45%,transparent)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
      />
    </div>
  ),
);
Select.displayName = 'Select';
