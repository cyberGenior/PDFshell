'use client';

import { Fragment } from 'react';
import { ChevronRight, X, Workflow } from 'lucide-react';
import { useActiveFlow, exitFlow } from '@/lib/flows';
import { getTool } from '@/lib/tools';

/** A slim progress bar shown while a one-click workflow is running. */
export function FlowBar() {
  const active = useActiveFlow();
  if (!active) return null;
  const { flow, step } = active;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_7%,transparent)] px-3 py-2.5 text-sm">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <Workflow className="size-4 text-[var(--brand)]" /> {flow.name}
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        {flow.steps.map((slug, i) => {
          const tool = getTool(slug);
          const state = i < step ? 'done' : i === step ? 'current' : 'todo';
          return (
            <Fragment key={slug}>
              {i > 0 && <ChevronRight className="size-3.5 text-[var(--muted-foreground)]" />}
              <span
                className={
                  'rounded-full px-2 py-0.5 text-xs ' +
                  (state === 'current'
                    ? 'gradient-brand font-medium text-white'
                    : state === 'done'
                      ? 'text-[var(--muted-foreground)] line-through'
                      : 'text-[var(--muted-foreground)]')
                }
              >
                {tool?.name ?? slug}
              </span>
            </Fragment>
          );
        })}
      </span>
      <span className="text-xs text-[var(--muted-foreground)]">Step {step + 1} of {flow.steps.length}</span>
      <button
        onClick={exitFlow}
        className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      >
        <X className="size-3.5" /> Exit
      </button>
    </div>
  );
}
