'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, BookOpen, Search, CornerDownLeft } from 'lucide-react';
import { TOOLS } from '@/lib/tools';
import { IconTile } from '@/components/ui/icon-tile';

interface Command {
  href: string;
  label: string;
  hint: string;
  icon: typeof Home;
}

const COMMANDS: Command[] = [
  { href: '/', label: 'Home', hint: 'Start over', icon: Home },
  ...TOOLS.filter((t) => t.ready).map((t) => ({ href: `/${t.slug}`, label: t.name, hint: t.tagline, icon: t.icon })),
  { href: '/guides', label: 'Guides', hint: 'How-tos & tips', icon: BookOpen },
];

/**
 * Ctrl/⌘-K command palette: jump to any tool by typing. A power-user shortcut
 * that also makes the whole toolkit feel like one fast product.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q));
  }, [query]);

  // Reset and focus each time it opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the element is mounted/animated in.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[active];
      if (pick) go(pick.href);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4">
              <Search className="size-4 shrink-0 text-[var(--muted-foreground)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search tools…"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
                aria-label="Search tools"
              />
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">No tools match “{query}”.</li>
              )}
              {results.map((c, i) => {
                const Icon = c.icon;
                return (
                  <li key={c.href}>
                    <button
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(c.href)}
                      className={
                        'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ' +
                        (i === active ? 'bg-[var(--surface-2)]' : '')
                      }
                    >
                      <IconTile size="sm">
                        <Icon />
                      </IconTile>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{c.label}</span>
                        <span className="block truncate text-xs text-[var(--muted-foreground)]">{c.hint}</span>
                      </span>
                      {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
