'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Combine, Minimize2, Pencil, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  href: string;
  label: string;
  icon: typeof Home;
}

// The handful of tools a phone user reaches for most; everything else is one
// tap away via the search button (opens the command palette).
const TABS: Tab[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/merge', label: 'Merge', icon: Combine },
  { href: '/compress', label: 'Compress', icon: Minimize2 },
  { href: '/edit', label: 'Edit', icon: Pencil },
];

/** A fixed bottom navigation bar, mobile only — the native-app pattern. */
export function MobileTabBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors [&_svg]:size-5',
              active ? 'text-[var(--brand)]' : 'text-[var(--muted-foreground)]',
            )}
          >
            <Icon />
            {tab.label}
          </Link>
        );
      })}
      <button
        onClick={onOpenPalette}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-[var(--muted-foreground)] transition-colors [&_svg]:size-5"
        aria-label="Search all tools"
      >
        <Search />
        All tools
      </button>
    </nav>
  );
}
