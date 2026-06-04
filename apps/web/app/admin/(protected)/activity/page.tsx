import { recentEvents } from '@/lib/server/stats';

export const dynamic = 'force-dynamic';

const TYPE_STYLE: Record<string, string> = {
  page_view: 'bg-[var(--c-sky)] text-[var(--c-sky-ink)]',
  tool_used: 'bg-[var(--c-lavender)] text-[var(--c-lavender-ink)]',
  conversion: 'bg-[var(--c-mint)] text-[var(--c-mint-ink)]',
  error: 'bg-red-500/15 text-red-500',
  ad_impression: 'bg-[var(--c-yellow)] text-[var(--c-yellow-ink)]',
  ad_click: 'bg-[var(--c-yellow)] text-[var(--c-yellow-ink)]',
};

export default async function ActivityPage() {
  const events = await recentEvents(100);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight">Activity</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Most recent {events.length} events.</p>
      </div>

      <div className="card-shadow overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Event</th>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Device</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Country</th>
              <th className="hidden px-4 py-2.5 font-medium lg:table-cell">IP</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No events yet — browse the site to generate some.</td></tr>
            ) : (
              events.map((e, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--muted-foreground)]">{e.ts.replace('T', ' ').slice(0, 19)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${TYPE_STYLE[e.type] ?? 'bg-[var(--surface-2)]'}`}>{e.type}</span>
                  </td>
                  <td className="max-w-40 truncate px-4 py-2.5" title={e.name ?? ''}>{e.name ?? '—'}</td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">{e.device ?? '—'}</td>
                  <td className="hidden px-4 py-2.5 md:table-cell">{e.country ?? '—'}</td>
                  <td className="hidden px-4 py-2.5 font-mono text-xs lg:table-cell">{e.ip ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
