'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, ShieldCheck, Github, X, BookOpen, Workflow } from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { IconTile } from '@/components/ui/icon-tile';
import { InstallPrompt } from '@/components/shell/InstallPrompt';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  ready: boolean;
  badge?: string;
}

const HOME: NavItem = { href: '/', label: 'Home', icon: Home, ready: true };
const FLOWS_ITEM: NavItem = { href: '/flows', label: 'Workflows', icon: Workflow, ready: true };
const GUIDES_ITEM: NavItem = { href: '/guides', label: 'Guides', icon: BookOpen, ready: true };
const TOOL_ITEMS: NavItem[] = TOOLS.map((t) => ({
  href: `/${t.slug}`,
  label: t.name,
  icon: t.icon,
  ready: t.ready,
  badge: t.ready ? undefined : `P${t.phase}`,
}));

const READY = TOOL_ITEMS.filter((t) => t.ready);
const SOON = TOOL_ITEMS.filter((t) => !t.ready);

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      {/* Brand / status */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="relative">
          <span className="grid size-10 place-items-center rounded-xl gradient-brand text-lg font-bold text-white">
            P
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[oklch(0.75_0.18_150)] ring-2 ring-[var(--surface)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">PDFShell</p>
          <p className="truncate text-[11px] text-[var(--muted-foreground)]">All local · Private</p>
        </div>
        <button
          onClick={onNavigate}
          className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] md:hidden"
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <NavLink item={HOME} active={isActive(HOME.href)} onNavigate={onNavigate} />
        <NavLink item={FLOWS_ITEM} active={isActive(FLOWS_ITEM.href)} onNavigate={onNavigate} />

        <Group label="Tools" />
        <div className="flex flex-col gap-1">
          {READY.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onNavigate} />
          ))}
        </div>

        {SOON.length > 0 && (
          <>
            <Group label="Coming soon" />
            <div className="flex flex-col gap-1">
              {SOON.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onNavigate} />
              ))}
            </div>
          </>
        )}

        <Group label="Learn" />
        <NavLink item={GUIDES_ITEM} active={isActive(GUIDES_ITEM.href)} onNavigate={onNavigate} />
      </nav>

      <div className="flex flex-col gap-2">
        <InstallPrompt />
        <a
          href="https://github.com/cyberGenior/PDFshell"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          <IconTile size="sm">
            <Github />
          </IconTile>
          Open source
        </a>
        <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
          <ShieldCheck className="size-3.5 shrink-0 text-[oklch(0.6_0.13_160)]" />
          Files never leave this device.
        </div>
      </div>
    </div>
  );
}

function Group({ label }: { label: string }) {
  return (
    <p className="px-2 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
      {label}
    </p>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors',
        active ? 'text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="gradient-brand absolute inset-0 rounded-xl shadow-md shadow-[color-mix(in_oklch,var(--brand)_30%,transparent)]"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <span className="relative z-10">
        {active ? (
          <span className="grid size-10 place-items-center rounded-xl bg-white/20 text-white [&_svg]:size-[18px]">
            <Icon />
          </span>
        ) : (
          <IconTile>
            <Icon />
          </IconTile>
        )}
      </span>
      <span className="relative z-10 flex-1 truncate text-sm font-medium">{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            'relative z-10 grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px]',
            active ? 'border border-white/40 text-white/90' : 'border border-[var(--border)] text-[var(--muted-foreground)]',
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
