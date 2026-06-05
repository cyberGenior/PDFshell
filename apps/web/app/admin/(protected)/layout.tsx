import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Activity, Sparkles, Megaphone, Settings, Share2 } from 'lucide-react';
import { getSessionAdmin } from '@/lib/server/auth';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/activity', label: 'Activity', icon: Activity },
  { href: '/admin/ai', label: 'AI Models', icon: Sparkles },
  { href: '/admin/ads', label: 'Ads', icon: Megaphone },
  { href: '/admin/share', label: 'Share', icon: Share2 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSessionAdmin();
  if (!admin) redirect('/admin/login');

  return (
    <div className="flex min-h-dvh bg-[var(--background)]">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <span className="grid size-9 place-items-center rounded-xl gradient-brand text-base font-bold text-white">P</span>
          <div>
            <p className="text-sm font-semibold">PDFShell</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">Admin</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs">
          <span className="truncate">
            <span className="text-[var(--muted-foreground)]">Signed in as</span>{' '}
            <strong>{admin.username}</strong>
          </span>
          <AdminLogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 md:hidden">
          <span className="grid size-8 place-items-center rounded-lg gradient-brand text-sm font-bold text-white">P</span>
          <span className="font-semibold">PDFShell Admin</span>
          <span className="ml-auto"><AdminLogoutButton /></span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          {admin.must_change_password === 1 && (
            <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              You’re using the default password. Change it in <Link href="/admin/settings" className="underline">Settings</Link>.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
