import { getToolContent } from '@/lib/toolContent';

/**
 * Renders the per-tool intro + how-to + FAQ below the tool widget, and emits
 * FAQPage structured data. Server component (so the content and schema are in the
 * initial HTML for crawlers). Renders nothing for routes without content.
 */
export function ToolSeoContent({ path }: { path: string }) {
  const c = getToolContent(path);
  if (!c) return null;

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <section className="mx-auto mt-12 w-full max-w-3xl border-t border-[var(--border)] pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <h2 className="font-serif text-xl font-medium tracking-tight text-[var(--foreground)]">{c.heading}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{c.intro}</p>

      <h3 className="mt-7 text-sm font-semibold text-[var(--foreground)]">How it works</h3>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
        {c.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

      <h3 className="mt-7 text-sm font-semibold text-[var(--foreground)]">Frequently asked questions</h3>
      <dl className="mt-2 space-y-4">
        {c.faqs.map((f, i) => (
          <div key={i}>
            <dt className="text-sm font-medium text-[var(--foreground)]">{f.q}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
