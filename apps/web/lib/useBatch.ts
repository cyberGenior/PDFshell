'use client';

import { useCallback, useRef, useState } from 'react';
import { makeZip } from '@/lib/zip';
import { downloadBlob } from '@/lib/utils';

export type BatchStatus = 'queued' | 'working' | 'done' | 'error';

export interface BatchItem {
  file: File;
  status: BatchStatus;
  outName?: string;
  bytes?: Uint8Array;
  error?: string;
}

/**
 * Run one operation over many files, one at a time (sequential — memory-safe on
 * low-end devices), tracking per-file status. A single file failing doesn't abort
 * the rest. Successful outputs can be downloaded together as a ZIP.
 */
export function useBatch() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const itemsRef = useRef<BatchItem[]>([]);
  itemsRef.current = items;

  const setFiles = useCallback((files: File[]) => {
    setItems(files.map((f) => ({ file: f, status: 'queued' as BatchStatus })));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const run = useCallback(
    async (op: (file: File) => Promise<Uint8Array>, outName: (file: File) => string) => {
      const files = itemsRef.current.map((it) => it.file);
      setRunning(true);
      setItems((prev) => prev.map((it) => ({ ...it, status: 'queued', bytes: undefined, error: undefined })));
      for (let i = 0; i < files.length; i++) {
        const f = files[i]!;
        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: 'working' } : it)));
        try {
          const bytes = await op(f);
          setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: 'done', bytes, outName: outName(f) } : it)));
        } catch (e) {
          const error = e instanceof Error ? e.message : 'Failed';
          setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: 'error', error } : it)));
        }
      }
      setRunning(false);
    },
    [],
  );

  const downloadZip = useCallback((zipName: string) => {
    const done = itemsRef.current.filter((it) => it.status === 'done' && it.bytes);
    if (!done.length) return;
    const zip = makeZip(done.map((it) => ({ name: it.outName ?? it.file.name, data: it.bytes! })));
    downloadBlob(zip, zipName, 'application/zip');
  }, []);

  const doneCount = items.filter((it) => it.status === 'done').length;
  const errorCount = items.filter((it) => it.status === 'error').length;

  return { items, running, doneCount, errorCount, setFiles, clear, run, downloadZip };
}
