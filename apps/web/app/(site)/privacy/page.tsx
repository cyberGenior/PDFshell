import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta('/privacy');

const UPDATED = '12 June 2026';

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">Last updated: {UPDATED}</p>

      <Section title="The short version">
        <p>
          PDFShell processes your documents <strong>on your own device, inside your browser</strong>. When you merge,
          split, compress, edit, OCR, scan or convert a file, that file is <strong>not uploaded to our servers</strong>{' '}
          and is <strong>not stored by us</strong> — it never leaves your device. The only exceptions are the few
          conversions that explicitly say they use our server (PDF to Word, Excel and PowerPoint), where the file is
          processed in memory and deleted immediately afterwards.
        </p>
      </Section>

      <Section title="What we collect">
        <p>We deliberately collect as little as possible. We do not ask for an account and we never see your file contents. We do collect:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <strong>Anonymous usage analytics</strong> — which tools are used and basic page views, to understand what’s
            useful and fix problems. This uses Google Analytics and a small first-party counter. A random, non-identifying
            ID is stored in your browser; it is not linked to your name or your files.
          </li>
          <li>
            <strong>Preferences and local data you choose to keep</strong> — settings (such as your OCR language) and, only
            if you tap “Keep on this device”, copies of your results in your browser’s storage, which auto-expire after 7
            days. This data stays on your device and is never sent to us.
          </li>
        </ul>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          PDFShell itself uses your browser’s local storage for preferences and the optional “Recent files” feature.
          Third-party services we use — Google Analytics and, where enabled, Google AdSense — may set their own cookies.
          You can clear these at any time in your browser settings, and most browsers let you block third-party cookies.
        </p>
      </Section>

      <Section title="Advertising">
        <p>
          To keep PDFShell free, some pages may show ads served by <strong>Google AdSense</strong>, a third-party
          advertising provider.
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>Google, as a third-party vendor, uses cookies to serve ads based on a user’s prior visits to this and other websites.</li>
          <li>
            Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visits to
            PDFShell and/or other sites on the Internet.
          </li>
          <li>
            You can opt out of personalised advertising by visiting{' '}
            <a className="text-[var(--brand)] hover:underline" href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer">
              Google Ads Settings
            </a>
            . You can also opt out of some third-party vendors’ use of cookies for personalised advertising at{' '}
            <a className="text-[var(--brand)] hover:underline" href="https://www.aboutads.info/choices/" target="_blank" rel="noreferrer">
              aboutads.info
            </a>
            .
          </li>
          <li>
            For more on how Google uses data from sites that use its services, see{' '}
            <a className="text-[var(--brand)] hover:underline" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">
              policies.google.com/technologies/partner-sites
            </a>
            .
          </li>
          <li>
            If you are in the EEA, the UK or Switzerland, ads are shown subject to your consent, which we collect through
            Google’s consent message before any personalised advertising cookies are set.
          </li>
        </ul>
        <p className="mt-2">
          Any “Sponsored” cards shown directly by PDFShell are our own promotions and do not set advertising cookies.
        </p>
      </Section>

      <Section title="Third-party services we use">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Google Analytics</strong> — anonymous, aggregated usage statistics.</li>
          <li><strong>Google AdSense</strong> — advertising (where enabled).</li>
        </ul>
        <p className="mt-2">These providers process data under their own privacy policies. We do not sell your data, and we never share your files with anyone.</p>
      </Section>

      <Section title="Children">
        <p>PDFShell is a general-audience utility and is not directed at children under 13. We do not knowingly collect personal information from children.</p>
      </Section>

      <Section title="Your choices">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Block or clear cookies and local storage in your browser at any time.</li>
          <li>Opt out of personalised ads via the links above.</li>
          <li>Use the “Clear all” control on the home page to remove any files you kept on your device.</li>
        </ul>
      </Section>

      <Section title="Changes & contact">
        <p>
          We may update this policy as the product evolves; the “last updated” date above will change. PDFShell is
          open-source — you can read exactly how it works, or reach us with a privacy question, through our{' '}
          <a className="text-[var(--brand)] hover:underline" href="https://github.com/cyberGenior/PDFshell" target="_blank" rel="noreferrer">
            GitHub repository
          </a>
          .
        </p>
      </Section>

      <p className="mt-10 text-sm">
        <Link href="/about" className="text-[var(--brand)] hover:underline">About PDFShell</Link>
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
