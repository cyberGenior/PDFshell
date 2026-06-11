'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, ArrowRight, ShieldCheck, Star, History, Workflow } from 'lucide-react';
import { TOOLS, getTool } from '@/lib/tools';
import { useLocalStats } from '@/lib/stats';
import { UniversalDrop } from '@/components/home/UniversalDrop';
import { RecentFiles } from '@/components/home/RecentFiles';
import { IconTile } from '@/components/ui/icon-tile';
import { AdSlot } from '@/components/ads/AdSlot';
import { formatBytes } from '@/lib/utils';

const POWERED_BY = ['pdf-lib', 'PDF.js', 'Tesseract', 'LibreOffice', 'jsPDF', 'mammoth'];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const stats = useLocalStats();
  const tools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [query]);

  const recent = stats.recentTools.map(getTool).filter((t) => !!t);

  return (
    <div className="flex flex-col gap-14">
      {/* Hero — the drop zone IS the call to action. */}
      <section className="flex flex-col items-center gap-6 pt-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]">
          <ShieldCheck className="size-3.5 text-[var(--brand)]" />
          No uploads · No accounts · 100% in your browser
        </span>
        <h1 className="max-w-3xl font-serif text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
          Drop a file. Get it done.
        </h1>
        <p className="max-w-xl text-lg text-[var(--muted-foreground)]">
          Merge, split, compress, rotate, watermark, OCR, convert and protect — processed on your
          device wherever possible. Private by default, fast on a slow connection.
        </p>

        <UniversalDrop />

        {/* Personalised when you've used it; honest defaults when you haven't. */}
        <div className="relative mt-4 w-full max-w-3xl">
          <div className="mx-auto grid max-w-md grid-cols-1 gap-3 sm:max-w-none sm:grid-cols-3">
            <StatCard fill="var(--c-mint)" ink="var(--c-mint-ink)" big="0" label="uploads, ever" />
            {stats.files > 0 ? (
              <StatCard
                fill="var(--c-sky)"
                ink="var(--c-sky-ink)"
                big={String(stats.files)}
                label={`file${stats.files === 1 ? '' : 's'} you processed — all on this device`}
              />
            ) : (
              <StatCard fill="var(--c-sky)" ink="var(--c-sky-ink)" big="11" label="tools in your pocket" />
            )}
            {stats.savedBytes > 0 ? (
              <StatCard
                fill="var(--c-yellow)"
                ink="var(--c-yellow-ink)"
                big={formatBytes(stats.savedBytes)}
                label="of file size you've saved"
              />
            ) : (
              <StatCard fill="var(--c-yellow)" ink="var(--c-yellow-ink)" big="100+" label="OCR languages" />
            )}
          </div>
          <div className="pointer-events-none absolute -left-2 -top-3 hidden rotate-[-6deg] rounded-2xl bg-[var(--c-lavender)] px-3 py-1.5 text-xs font-medium text-[var(--c-lavender-ink)] shadow-sm lg:block">
            <Star className="mb-0.5 mr-1 inline size-3.5 fill-current" /> Privacy-first
          </div>
        </div>
      </section>

      {/* Sponsor slot — renders nothing if no active banner ad. */}
      <AdSlot placement="landing-banner" />

      {/* Device-local vault of kept outputs (renders nothing until you keep one). */}
      <RecentFiles />

      {/* Pick up where you left off. */}
      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            <History className="size-3.5" /> Recently used
          </p>
          <div className="flex flex-wrap gap-2">
            {recent.map((tool) => (
              <Link
                key={tool.slug}
                href={`/${tool.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <tool.icon className="size-4" /> {tool.name}
                <ArrowRight className="size-3" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* One-click workflows entry point */}
      <Link
        href="/flows"
        className="card-shadow group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-[var(--ring)]"
      >
        <IconTile size="lg" active>
          <Workflow />
        </IconTile>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold tracking-tight">One-click workflows</h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Multi-step tasks done in one guided flow — scan &amp; clean up, scan to searchable text, combine &amp; compress.
          </p>
        </div>
        <ArrowRight className="size-4 shrink-0 -translate-x-1 text-[var(--muted-foreground)] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </Link>

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
