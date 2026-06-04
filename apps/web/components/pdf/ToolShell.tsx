import { getTool } from '@/lib/tools';
import { IconTile } from '@/components/ui/icon-tile';

/** Title block shared by every tool page, driven by the tool registry. */
export function ToolShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const tool = getTool(slug);
  const Icon = tool?.icon;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        {Icon && (
          <IconTile size="lg" active>
            <Icon />
          </IconTile>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{tool?.name ?? slug}</h1>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {tool?.description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
