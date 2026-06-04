import { getDb } from '@/lib/server/db';
import { dailyCounts, topTools, deviceSplit, topCountries } from '@/lib/server/stats';
import { BarChart, RankBars } from '@/components/admin/Charts';
import { Eye, Wrench, FileOutput, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

function count(sql: string): number {
  const row = getDb().prepare(sql).get() as { c: number } | undefined;
  return row?.c ?? 0;
}

export default function AdminDashboard() {
  const views = count("SELECT COUNT(*) c FROM events WHERE type = 'page_view'");
  const tools = count("SELECT COUNT(*) c FROM events WHERE type = 'tool_used'");
  const conversions = count("SELECT COUNT(*) c FROM events WHERE type = 'conversion'");
  const visitors = count('SELECT COUNT(DISTINCT visitor_id) c FROM events');

  const stats = [
    { label: 'Page views', value: views, icon: Eye, fill: 'var(--c-sky)', ink: 'var(--c-sky-ink)' },
    { label: 'Unique visitors', value: visitors, icon: Users, fill: 'var(--c-mint)', ink: 'var(--c-mint-ink)' },
    { label: 'Tool uses', value: tools, icon: Wrench, fill: 'var(--c-lavender)', ink: 'var(--c-lavender-ink)' },
    { label: 'Conversions', value: conversions, icon: FileOutput, fill: 'var(--c-yellow)', ink: 'var(--c-yellow-ink)' },
  ];

  const daily = dailyCounts(14);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-medium tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-5" style={{ backgroundColor: s.fill, color: s.ink }}>
              <Icon className="size-5" />
              <p className="mt-3 font-serif text-3xl font-semibold leading-none">{s.value}</p>
              <p className="mt-1.5 text-sm font-medium opacity-80">{s.label}</p>
            </div>
          );
        })}
      </div>

      <Card title="Activity — last 14 days">
        <BarChart data={daily} />
        <div className="mt-1 flex justify-between text-[11px] text-[var(--muted-foreground)]">
          <span>{daily[0]?.label}</span>
          <span>{daily[daily.length - 1]?.label}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Top tools"><RankBars data={topTools()} empty="No tool usage yet" /></Card>
        <Card title="Devices"><RankBars data={deviceSplit()} empty="No views yet" /></Card>
        <Card title="Top countries"><RankBars data={topCountries()} empty="No geo data yet" /></Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-shadow rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
