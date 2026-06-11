'use client';

import { useEffect, useState } from 'react';

/**
 * Recent-outputs vault: an OPT-IN, device-local stash of files the user chose to
 * keep. Nothing is written here unless the user clicks "Keep on this device", so
 * the default "nothing is stored" promise still holds. Entries live in IndexedDB
 * and auto-expire after 7 days. Nothing ever leaves the device.
 */
const DB_NAME = 'pdfshell';
const STORE = 'outputs';
const DB_VERSION = 1;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CHANGED_EVENT = 'pdfshell:vault-changed';

export interface VaultEntry {
  id: string;
  name: string;
  tool: string;
  mime: string;
  size: number;
  createdAt: number;
  blob: Blob;
}

let counter = 0;
function makeId(): string {
  // Date/random are fine here (client-only, no workflow-replay concerns).
  return `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function emitChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** Store a copy of an output on this device. Returns the new entry's id. */
export async function keepOutput(input: { name: string; bytes: Uint8Array; tool: string; mime?: string }): Promise<string> {
  const db = await openDb();
  const id = makeId();
  const entry: VaultEntry = {
    id,
    name: input.name,
    tool: input.tool,
    mime: input.mime ?? 'application/pdf',
    size: input.bytes.byteLength,
    createdAt: Date.now(),
    blob: new Blob([input.bytes as BlobPart], { type: input.mime ?? 'application/pdf' }),
  };
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put(entry);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  db.close();
  emitChanged();
  return id;
}

/** List kept outputs, newest first, pruning anything past its 7-day expiry. */
export async function listOutputs(): Promise<VaultEntry[]> {
  const db = await openDb();
  const all = await new Promise<VaultEntry[]>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as VaultEntry[]);
    req.onerror = () => reject(req.error);
  });
  const now = Date.now();
  const fresh = all.filter((e) => now - e.createdAt < TTL_MS);
  const expired = all.filter((e) => now - e.createdAt >= TTL_MS);
  if (expired.length) {
    await new Promise<void>((resolve) => {
      const t = db.transaction(STORE, 'readwrite');
      for (const e of expired) t.objectStore(STORE).delete(e.id);
      t.oncomplete = () => resolve();
      t.onerror = () => resolve();
    });
  }
  db.close();
  return fresh.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteOutput(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  db.close();
  emitChanged();
}

export async function clearOutputs(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  db.close();
  emitChanged();
}

/** Days remaining before an entry expires (rounded up, min 1 while it exists). */
export function daysLeft(entry: VaultEntry): number {
  return Math.max(1, Math.ceil((entry.createdAt + TTL_MS - Date.now()) / (24 * 60 * 60 * 1000)));
}

/** Reactive list of kept outputs that refreshes when the vault changes. */
export function useVault(): { entries: VaultEntry[]; loading: boolean; refresh: () => void } {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    listOutputs()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CHANGED_EVENT, onChange);
  }, []);

  return { entries, loading, refresh };
}
