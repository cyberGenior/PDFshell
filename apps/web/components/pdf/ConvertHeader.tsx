import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getConversion } from '@/lib/conversions';
import { IconTile } from '@/components/ui/icon-tile';

/** Header for a single conversion sub-page: back link + icon + title. */
export function ConvertHeader({ slug }: { slug: string }) {
  const c = getConversion(slug);
  const Icon = c?.icon;
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/convert"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        All conversions
      </Link>
      <div className="flex items-start gap-4">
        {Icon && (
          <IconTile size="lg" active>
            <Icon />
          </IconTile>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{c?.title ?? slug}</h1>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {c?.description}
          </p>
        </div>
      </div>
    </div>
  );
}
