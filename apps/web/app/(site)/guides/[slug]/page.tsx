import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { GUIDES, getGuide } from '@/lib/guides';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  const full = `${g.title} — ${SITE_NAME}`;
  return {
    title: { absolute: full },
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { title: full, description: g.description, url: `/guides/${g.slug}`, type: 'article' },
    twitter: { card: 'summary_large_image', title: full, description: g.description },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: g.title,
      description: g.description,
      mainEntityOfPage: `${SITE_URL}/guides/${g.slug}`,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: g.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-4" /> All guides
      </Link>

      <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight">{g.title}</h1>
      <p className="mt-3 text-[var(--muted-foreground)]">{g.intro}</p>

      {g.sections.map((s, i) => (
        <section key={i} className="mt-8">
          <h2 className="font-serif text-xl font-medium tracking-tight">{s.heading}</h2>
          {s.steps && (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[var(--muted-foreground)]">
              {s.steps.map((step, j) => (
                <li key={j}>{step}</li>
              ))}
            </ol>
          )}
          {s.paragraphs?.map((p, j) => (
            <p key={j} className="mt-3 leading-relaxed text-[var(--muted-foreground)]">
              {p}
            </p>
          ))}
        </section>
      ))}

      <div className="mt-8">
        <Link
          href={g.tool.href}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-[var(--background)]"
        >
          {g.tool.label} <ArrowRight className="size-4" />
        </Link>
      </div>

      <section className="mt-10 border-t border-[var(--border)] pt-8">
        <h2 className="font-serif text-xl font-medium tracking-tight">Frequently asked questions</h2>
        <dl className="mt-3 space-y-4">
          {g.faqs.map((f, i) => (
            <div key={i}>
              <dt className="font-medium">{f.q}</dt>
              <dd className="mt-1 leading-relaxed text-[var(--muted-foreground)]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
