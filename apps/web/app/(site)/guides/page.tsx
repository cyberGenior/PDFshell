import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { GUIDES } from '@/lib/guides';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: { absolute: `PDF Guides & How-tos — ${SITE_NAME}` },
  description:
    'Free, step-by-step guides for working with PDFs — merge, convert to Excel/Word, edit, OCR and compress, all privately in your browser.',
  alternates: { canonical: '/guides' },
  openGraph: { title: `PDF Guides & How-tos — ${SITE_NAME}`, description: 'Step-by-step PDF how-tos.', url: '/guides', type: 'website' },
};

export default function GuidesIndex() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-serif text-3xl font-medium tracking-tight">PDF guides & how-tos</h1>
      <p className="mt-2 text-[var(--muted-foreground)]">
        Practical, no-nonsense guides for getting things done with PDFs — free, and private by
        default (your files never leave your device).
      </p>

      <ul className="mt-8 space-y-3">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="card-shadow group flex items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-[var(--ring)]"
            >
              <span>
                <span className="block font-medium">{g.title}</span>
                <span className="mt-1 block text-sm text-[var(--muted-foreground)]">{g.description}</span>
              </span>
              <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
