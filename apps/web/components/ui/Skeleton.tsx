import { cn } from '@/lib/utils';

/**
 * Shimmering placeholder for content that is still loading (PDF thumbnails,
 * result previews). Conveys "work in progress" without a jarring empty box.
 * The shimmer is defined in globals.css (`.skeleton`) and respects
 * prefers-reduced-motion (it degrades to a flat muted block).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />;
}
