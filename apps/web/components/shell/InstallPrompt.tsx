'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { track } from '@/lib/track';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// The event fires once, often before React mounts — stash it at module level.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listeners: Array<() => void> = [];

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
    track('tool_used', 'pwa-installed');
  });
}

/**
 * "Install app" button — appears only when the browser says PDFShell is
 * installable (Chrome/Edge/Android). Installed, the app opens from the home
 * screen and the on-device tools work offline.
 */
export function InstallPrompt() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const update = () => setAvailable(deferredPrompt !== null);
    update();
    listeners.push(update);
    return () => {
      listeners = listeners.filter((fn) => fn !== update);
    };
  }, []);

  if (!available) return null;

  async function install() {
    if (!deferredPrompt) return;
    track('tool_used', 'pwa-install-prompt');
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') deferredPrompt = null;
    setAvailable(deferredPrompt !== null);
  }

  return (
    <button
      type="button"
      onClick={install}
      className="flex w-full items-center gap-2 rounded-xl border border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] px-3 py-2 text-sm font-medium text-[var(--brand)] transition-colors hover:bg-[color-mix(in_oklch,var(--brand)_14%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <Download className="size-4 shrink-0" />
      Install the app — works offline
    </button>
  );
}
