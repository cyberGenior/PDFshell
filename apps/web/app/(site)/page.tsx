'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { IconTile } from '@/components/ui/icon-tile';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/ads/AdSlot';

const POWERED_BY = ['pdf-lib', 'PDF.js', 'Tesseract', 'LibreOffice', 'jsPDF', 'mammoth'];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const tools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-14">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 pt-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]">
          <ShieldCheck className="size-3.5 text-[var(--brand)]" />
          No uploads · No accounts · 100% in your browser
        </span>
        <h1 className="max-w-3xl font-serif text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
          Every PDF tool, right where your files already are.
        </h1>
        <p className="max-w-xl text-lg text-[var(--muted-foreground)]">
          Merge, split, compress, rotate, watermark, OCR, convert and protect — processed on your
          device wherever possible. Private by default, fast on a slow connection.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/merge"><Button size="lg">Start with Merge <ArrowRight /></Button></Link>
          <Link href="/ocr"><Button size="lg" variant="outline">Try OCR</Button></Link>
        </div>

        {/* Floating stat composition */}
        <div className="relative mt-6 w-full max-w-3xl">
          <div className="mx-auto grid max-w-md grid-cols-1 gap-3 sm:max-w-none sm:grid-cols-3">
            <StatCard fill="var(--c-mint)" ink="var(--c-mint-ink)" big="0" label="uploads, ever" />
            <StatCard fill="var(--c-sky)" ink="var(--c-sky-ink)" big="11" label="tools in your pocket" />
            <StatCard fill="var(--c-yellow)" ink="var(--c-yellow-ink)" big="100+" label="OCR languages" />
          </div>
          <div className="pointer-events-none absolute -left-2 -top-3 hidden rotate-[-6deg] rounded-2xl bg-[var(--c-lavender)] px-3 py-1.5 text-xs font-medium text-[var(--c-lavender-ink)] shadow-sm lg:block">
            <Star className="mb-0.5 mr-1 inline size-3.5 fill-current" /> Privacy-first
          </div>
        </div>
      </section>

      {/* Sponsor slot — renders nothing if no active banner ad. */}
      <AdSlot placement="landing-banner" />

      {/* Tools */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif text-2xl font-medium tracking-tight">All tools</h2>
          <label className="flex h-11 w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 sm:w-72">
            <Search className="size-4 text-[var(--muted-foreground)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, i) => {
            const Icon = tool.icon;
            const inner = (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                whileHover={{ y: -3 }}
                className="card-shadow group h-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-[var(--ring)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <IconTile size="lg" active={tool.ready}>
                    <Icon />
                  </IconTile>
                  {tool.ready ? (
                    <ArrowRight className="size-4 -translate-x-1 text-[var(--muted-foreground)] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  ) : (
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]">
                      Phase {tool.phase}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold tracking-tight">{tool.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">{tool.description}</p>
              </motion.div>
            );
            return tool.ready ? (
              <Link key={tool.slug} href={`/${tool.slug}`} className="block">{inner}</Link>
            ) : (
              <div key={tool.slug} className="cursor-default opacity-75">{inner}</div>
            );
          })}
        </div>
        {tools.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">No tools match “{query}”.</p>
        )}
      </section>

      {/* Powered by */}
      <section className="flex flex-col items-center gap-5 border-t border-[var(--border)] pt-10">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          Built on trusted open source
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {POWERED_BY.map((name) => (
            <span key={name} className="text-base font-semibold text-[var(--muted-foreground)]">
              {name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ fill, ink, big, label }: { fill: string; ink: string; big: string; label: string }) {
  return (
    <div className="rounded-2xl p-5 text-left" style={{ backgroundColor: fill, color: ink }}>
      <p className="font-serif text-4xl font-semibold leading-none">{big}</p>
      <p className="mt-2 text-sm font-medium">{label}</p>
    </div>
  );
}
