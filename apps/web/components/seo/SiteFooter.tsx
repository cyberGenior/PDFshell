import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { CONVERSIONS } from '@/lib/conversions';
import { GUIDES } from '@/lib/guides';
import { SITE_NAME } from '@/lib/seo';

/**
 * Site-wide footer. A server component (pure HTML, zero client JS) so its
 * keyword-rich internal links ship in the initial markup — the cheapest, most
 * durable internal-linking win for crawlers. Every list is derived from the
 * single sources of truth (TOOLS / CONVERSIONS / GUIDES), so it never drifts.
 */
export function SiteFooter() {
  const tools = TOOLS.filter((t) => t.ready);
  const conversions = CONVERSIONS.filter((c) => c.ready);

  return (
    <footer className="mt-12 border-t border-[var(--border)] bg-[var(--surface)] px-4 pb-24 pt-10 sm:px-6 md:pb-10 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
        <nav aria-label="PDF tools" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">PDF tools</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {tools.map((t) => (
              <li key={t.slug}>
                <Link href={`/${t.slug}`} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Convert PDF" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Convert</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {conversions.map((c) => (
              <li key={c.slug}>
                <Link href={`/convert/${c.slug}`} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Guides" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Guides</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="More" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">More</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li><Link href="/" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Home</Link></li>
            <li><Link href="/flows" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">One-click workflows</Link></li>
            <li><Link href="/guides" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">All guides</Link></li>
            <li>
              <a href="https://github.com/cyberGenior/PDFshell" target="_blank" rel="noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                Open source
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-5xl flex-col gap-2 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
        <p>© {SITE_NAME} — free, open-source PDF tools.</p>
        <p className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-[var(--brand)]" /> Your files never leave your device.
        </p>
      </div>
    </footer>
  );
}
