'use client';

import { create } from 'zustand';
import { useEffect, useRef } from 'react';

/**
 * Tool chaining: pass the result of one tool straight into another without the
 * user re-picking the file. The bytes live only in this in-memory store —
 * nothing is uploaded or persisted, consistent with the privacy promise.
 */
export interface HandoffDoc {
  bytes: Uint8Array;
  name: string;
}

interface HandoffState {
  doc: HandoffDoc | null;
  put: (doc: HandoffDoc) => void;
  /** Read-and-clear, so a stale document never leaks into a later visit. */
  take: () => HandoffDoc | null;
}

export const useHandoff = create<HandoffState>((set, get) => ({
  doc: null,
  put: (doc) => set({ doc }),
  take: () => {
    const doc = get().doc;
    if (doc) set({ doc: null });
    return doc;
  },
}));

/**
 * On mount, if another tool handed a document over, deliver it to the page as
 * a File (the same shape DropZone produces) exactly once.
 */
export function usePendingDoc(onFile: (file: File) => void): void {
  const taken = useRef(false);
  const take = useHandoff((s) => s.take);

  useEffect(() => {
    if (taken.current) return;
    taken.current = true;
    const doc = take();
    if (doc) {
      onFile(new File([doc.bytes as BlobPart], doc.name, { type: 'application/pdf' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
