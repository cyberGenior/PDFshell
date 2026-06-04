import type { Bucket } from '@/lib/server/stats';

/** Vertical bar chart (dependency-free SVG) for a daily time series. */
export function BarChart({ data, height = 120 }: { data: Bucket[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-32 w-full">
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 16);
        return (
          <g key={i}>
            <rect
              x={i * w + w * 0.15}
              y={height - h - 12}
              width={w * 0.7}
              height={Math.max(h, 0.5)}
              rx={1}
              fill="var(--brand)"
              opacity={0.85}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal labelled bars for categorical breakdowns. */
export function RankBars({ data, empty = 'No data yet' }: { data: Bucket[]; empty?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="text-sm text-[var(--muted-foreground)]">{empty}</p>;
  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 truncate text-[var(--muted-foreground)]" title={d.label}>
            {d.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div className="h-full rounded-full gradient-brand" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right tabular-nums">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
