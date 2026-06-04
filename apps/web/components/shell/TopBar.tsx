'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { getTool } from '@/lib/tools';
import { ThemeToggle } from '@/components/shell/ThemeToggle';

function useSectionTitle(): string {
  const pathname = usePathname();
  if (pathname === '/') return 'Home';
  const slug = pathname.split('/').filter(Boolean)[0] ?? '';
  return getTool(slug)?.name ?? 'PDFShell';
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const title = useSectionTitle();

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--border)] px-4 sm:px-6">
      <button
        onClick={onMenu}
        className="grid size-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
      </div>

      <ThemeToggle />

      <div className="relative">
        <span className="grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-sm font-semibold">
          You
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[oklch(0.75_0.18_150)] ring-2 ring-[var(--surface)]" />
      </div>
    </header>
  );
}
