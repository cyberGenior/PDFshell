'use client';

import { useDropzone, type Accept } from 'react-dropzone';
import { motion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: Accept;
  label?: string;
  hint?: string;
}

const PDF_ACCEPT: Accept = { 'application/pdf': ['.pdf'] };

/**
 * Drag-and-drop file input with accept/reject feedback. Files are handed to the
 * caller as in-memory File objects — nothing is uploaded anywhere.
 */
export function DropZone({
  onFiles,
  multiple = true,
  accept = PDF_ACCEPT,
  label = 'Drop PDFs here, or click to browse',
  hint = 'Your files never leave this device.',
}: DropZoneProps) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept,
    multiple,
    onDrop: (accepted) => {
      if (accepted.length > 0) onFiles(accepted);
    },
  });

  return (
    <motion.div
      {...(getRootProps() as object)}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center transition-colors',
        isDragActive && 'border-[var(--brand)]',
        isDragReject && 'border-red-500',
      )}
    >
      {/* Soft gradient wash that intensifies while dragging. */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          isDragActive && 'opacity-100',
        )}
        style={{
          background:
            'radial-gradient(60% 60% at 50% 40%, color-mix(in oklch, var(--grad-via) 18%, transparent), transparent)',
        }}
      />
      {/* The input carries the accessible name; the root stays role-free so
          the focusable input inside it isn't a nested interactive control. */}
      <input {...getInputProps({ 'aria-label': `${label}. ${hint}` })} />
      <motion.span
        animate={isDragActive ? { y: -4 } : { y: 0 }}
        className="relative grid size-14 place-items-center rounded-2xl gradient-brand text-white shadow-lg"
      >
        <UploadCloud className="size-6" />
      </motion.span>
      <div className="relative">
        <p className="font-medium">
          {isDragReject ? 'That file type is not supported' : label}
        </p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{hint}</p>
      </div>
    </motion.div>
  );
}
