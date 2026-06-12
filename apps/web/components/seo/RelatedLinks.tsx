import Link from 'next/link';
import { relatedTools, siblingConversions, relatedGuides } from '@/lib/related';

/**
 * Contextual cross-links shown under a tool's SEO content (server component).
 * Closes the "tools don't link to each other or to guides" gap — internal links
 * are one of the strongest on-page ranking levers, and this ships as pure HTML.
 */
export function RelatedLinks({ path }: { path: string }) {
  const isConvertSub = path.startsWith('/convert/');
  const slug = isConvertSub ? path.slice('/convert/'.length) : path.slice(1);

  const tools = isConvertSub ? [] : relatedTools(slug);
  const convs = isConvertSub ? siblingConversions(slug) : [];
  const guides = relatedGuides(path);

  if (tools.length === 0 && convs.length === 0 && guides.length === 0) return null;

  return (
    <div className="mt-10 grid gap-6 border-t border-[var(--border)] pt-8 sm:grid-cols-2">
      {(tools.length > 0 || convs.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Related tools</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {tools.map((t) => (
              <li key={t.slug}>
                <Link href={`/${t.slug}`} className="text-[var(--brand)] hover:underline">{t.name}</Link>
              </li>
            ))}
            {convs.map((c) => (
              <li key={c.slug}>
                <Link href={`/convert/${c.slug}`} className="text-[var(--brand)] hover:underline">{c.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {guides.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Related guides</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="text-[var(--brand)] hover:underline">{g.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
