'use client';

import { create } from 'zustand';
import { useEffect, useRef } from 'react';

/**
 * Tool chaining: pass the result of one tool (or a file dropped on the landing
 * page) straight into another tool without the user re-picking it. The bytes
 * live only in this in-memory store — nothing is uploaded or persisted,
 * consistent with the privacy promise.
 */
export interface HandoffDoc {
  bytes: Uint8Array;
  name: string;
  /** MIME type for reconstructing the File. Defaults to application/pdf. */
  type?: string;
}

interface HandoffState {
  docs: HandoffDoc[];
  put: (doc: HandoffDoc) => void;
  putMany: (docs: HandoffDoc[]) => void;
  /** Read-and-clear, so a stale document never leaks into a later visit. */
  takeAll: () => HandoffDoc[];
}

export const useHandoff = create<HandoffState>((set, get) => ({
  docs: [],
  put: (doc) => set({ docs: [doc] }),
  putMany: (docs) => set({ docs }),
  takeAll: () => {
    const docs = get().docs;
    if (docs.length) set({ docs: [] });
    return docs;
  },
}));

function toFile(doc: HandoffDoc): File {
  return new File([doc.bytes as BlobPart], doc.name, {
    type: doc.type ?? 'application/pdf',
  });
}

/**
 * On mount, if another page handed documents over, deliver them to this page
 * as Files (the same shape DropZone produces) exactly once.
 */
export function usePendingDocs(onFiles: (files: File[]) => void): void {
  const taken = useRef(false);
  const takeAll = useHandoff((s) => s.takeAll);

  useEffect(() => {
    if (taken.current) return;
    taken.current = true;
    const docs = takeAll();
    if (docs.length) onFiles(docs.map(toFile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Single-file convenience over {@link usePendingDocs}. */
export function usePendingDoc(onFile: (file: File) => void): void {
  usePendingDocs((files) => {
    if (files[0]) onFile(files[0]);
  });
}
