import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta('/about');

export default function AboutPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-serif text-3xl font-medium tracking-tight">About PDFShell</h1>

      <p className="mt-4 leading-relaxed text-[var(--muted-foreground)]">
        PDFShell is a free, open-source toolkit for working with PDFs — merging, splitting, compressing, editing, OCR,
        scanning and converting — that runs <strong>entirely in your browser</strong>. Most “online PDF” services upload
        your documents to their servers; PDFShell does the work on your own device using WebAssembly, so your files never
        leave your computer or phone.
      </p>

      <Section title="Why we built it">
        <p>
          Sensitive documents — contracts, IDs, payslips, bank statements — shouldn’t have to be handed to a stranger’s
          server just to merge or compress them. We wanted a set of everyday PDF tools that are genuinely private, free,
          and fast on the kind of connection most people actually have.
        </p>
      </Section>

      <Section title="Built for real-world connections">
        <p>
          PDFShell is engineered for low-bandwidth, metered and intermittent connections — common across much of Africa,
          where the project is based. Because processing happens on-device, you’re not uploading and downloading large
          files, the tools work offline once loaded, and the app installs as a lightweight progressive web app. There are
          no accounts, no watermarks and no page limits.
        </p>
      </Section>

      <Section title="How it stays free">
        <p>
          PDFShell is open-source and supported by unobtrusive advertising on some pages. Ads help cover hosting so the
          tools can stay free for everyone, with the files themselves always processed privately on your device. See our{' '}
          <Link href="/privacy" className="text-[var(--brand)] hover:underline">Privacy Policy</Link> for exactly what is
          and isn’t collected.
        </p>
      </Section>

      <Section title="Open source">
        <p>
          You don’t have to take our word for the privacy promise — the code is public. Read it, audit it, or contribute
          on{' '}
          <a className="text-[var(--brand)] hover:underline" href="https://github.com/cyberGenior/PDFshell" target="_blank" rel="noreferrer">
            GitHub
          </a>
          , which is also the best place to report an issue or ask a question.
        </p>
      </Section>

      <p className="mt-10 text-sm">
        <Link href="/" className="text-[var(--brand)] hover:underline">← Back to the tools</Link>
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-medium tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-[var(--muted-foreground)]">{children}</div>
    </section>
  );
}
