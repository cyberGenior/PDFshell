import { Construction } from 'lucide-react';
import { getTool } from '@/lib/tools';

/** Placeholder body for tools not yet implemented (Phase 2+ on the roadmap). */
export function ComingSoon({ slug }: { slug: string }) {
  const tool = getTool(slug);
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/40 px-6 py-16 text-center">
      <Construction className="size-9 text-[var(--muted-foreground)]" />
      <p className="font-medium">{tool?.name} is on the way</p>
      <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
        Scheduled for Phase {tool?.phase} of the roadmap. Like everything in PDFShell, it will run
        entirely in your browser — no uploads.
      </p>
    </div>
  );
}
