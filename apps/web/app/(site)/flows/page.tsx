'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Workflow } from 'lucide-react';
import { FLOWS, startFlow } from '@/lib/flows';
import { getTool } from '@/lib/tools';
import { IconTile } from '@/components/ui/icon-tile';
import { track } from '@/lib/track';

export default function FlowsPage() {
  const router = useRouter();

  function start(slug: string, firstStep: string) {
    startFlow(slug);
    track('tool_used', `flow-start:${slug}`);
    router.push(`/${firstStep}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start gap-4">
        <IconTile size="lg" active>
          <Workflow />
        </IconTile>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">One-click workflows</h1>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
            Chain a few tools into a single guided task. Start one and PDFShell hands your file from
            step to step — no re-uploading, all on your device.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FLOWS.map((flow, i) => (
          <motion.button
            key={flow.slug}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
            whileHover={{ y: -3 }}
            onClick={() => start(flow.slug, flow.steps[0]!)}
            className="card-shadow group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left transition-colors hover:border-[var(--ring)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight">{flow.name}</h2>
              <ArrowRight className="size-4 -translate-x-1 text-[var(--muted-foreground)] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </div>
            <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{flow.description}</p>
            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
              {flow.steps.map((slug, s) => {
                const tool = getTool(slug);
                const Icon = tool?.icon;
                return (
                  <span key={slug} className="flex items-center gap-1.5">
                    {s > 0 && <ChevronRight className="size-3.5 text-[var(--muted-foreground)]" />}
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium">
                      {Icon && <Icon className="size-3.5" />} {tool?.name ?? slug}
                    </span>
                  </span>
                );
              })}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
