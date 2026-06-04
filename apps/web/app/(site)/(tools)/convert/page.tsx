'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { CONVERSIONS } from '@/lib/conversions';
import { ToolShell } from '@/components/pdf/ToolShell';
import { IconTile } from '@/components/ui/icon-tile';

export default function ConvertHub() {
  return (
    <ToolShell slug="convert">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONVERSIONS.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.25) }}
              whileHover={{ y: -3 }}
            >
              <Link
                href={`/convert/${c.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-[var(--ring)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <IconTile size="lg" active={c.engine === 'client'}>
                    <Icon />
                  </IconTile>
                  <ArrowRight className="size-4 -translate-x-1 text-[var(--muted-foreground)] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
                <h3 className="font-semibold tracking-tight">{c.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {c.description}
                </p>
                {c.engine === 'client' && (
                  <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]">
                    <ShieldCheck className="size-3" /> On-device
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        <ShieldCheck className="mb-0.5 mr-1 inline size-3.5 text-[oklch(0.85_0.2_140)]" />
        On-device conversions never upload your file.
      </p>
    </ToolShell>
  );
}
