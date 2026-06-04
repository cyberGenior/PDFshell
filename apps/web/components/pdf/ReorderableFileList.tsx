'use client';

import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, X, FileText } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

export interface PdfFile {
  /** Stable id for reorder keying. */
  id: string;
  file: File;
}

interface ReorderableFileListProps {
  files: PdfFile[];
  onReorder: (files: PdfFile[]) => void;
  onRemove: (id: string) => void;
}

/**
 * Drag-and-drop reorderable list of selected PDFs, used by the Merge tool.
 * The list order is the merge order.
 */
export function ReorderableFileList({ files, onReorder, onRemove }: ReorderableFileListProps) {
  return (
    <Reorder.Group axis="y" values={files} onReorder={onReorder} className="flex flex-col gap-2">
      {files.map((item) => (
        <FileRow key={item.id} item={item} onRemove={() => onRemove(item.id)} />
      ))}
    </Reorder.Group>
  );
}

function FileRow({ item, onRemove }: { item: PdfFile; onRemove: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2.5"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab touch-none text-[var(--muted-foreground)] active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-5" />
      </button>
      <FileText className="size-5 shrink-0 text-[var(--primary)]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.file.name}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(item.file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        aria-label={`Remove ${item.file.name}`}
      >
        <X className="size-4" />
      </button>
    </Reorder.Item>
  );
}
