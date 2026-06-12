'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import { breadcrumbList, ldGraph } from '@/lib/jsonLd';

/**
 * Visible breadcrumb trail + matching BreadcrumbList JSON-LD, rendered from one
 * place. It's a client component (needs the current path) but Next server-renders
 * it, so both the trail and the schema land in the initial HTML for every route —
 * no per-layout wiring, and the schema can never drift from what's shown.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);
  if (crumbs.length < 2) return null; // nothing useful to show on root-level pages

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-[var(--muted-foreground)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldGraph([breadcrumbList(crumbs)])) }}
      />
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={c.url}>
              {i > 0 && <ChevronRight className="size-3" aria-hidden />}
              <li>
                {last ? (
                  <span className="text-[var(--foreground)]" aria-current="page">{c.name}</span>
                ) : (
                  <Link href={c.url} className="hover:text-[var(--foreground)]">{c.name}</Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
