'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Combine,
  Crop,
  Droplets,
  FileText,
  Hash,
  Lock,
  Minimize2,
  Pencil,
  RotateCw,
  ScanText,
  Scissors,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react';
import { useHandoff, type HandoffDoc } from '@/lib/handoff';
import { Button } from '@/components/ui/button';
import { formatBytes, cn } from '@/lib/utils';
import { track } from '@/lib/track';

const PDF_ACTIONS: { slug: string; label: string; icon: LucideIcon }[] = [
  { slug: 'compress', label: 'Compress it', icon: Minimize2 },
  { slug: 'merge', label: 'Organize pages', icon: Combine },
  { slug: 'split', label: 'Split it', icon: Scissors },
  { slug: 'edit', label: 'Edit text', icon: Pencil },
  { slug: 'ocr', label: 'Extract text (OCR)', icon: ScanText },
  { slug: 'rotate', label: 'Rotate pages', icon: RotateCw },
  { slug: 'watermark', label: 'Watermark it', icon: Droplets },
  { slug: 'page-numbers', label: 'Add page numbers', icon: Hash },
  { slug: 'crop', label: 'Crop margins', icon: Crop },
  { slug: 'protect', label: 'Protect / unlock', icon: Lock },
];

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'],
};

async function toDocs(files: File[]): Promise<HandoffDoc[]> {
  return Promise.all(
    files.map(async (f) => ({
      bytes: new Uint8Array(await f.arrayBuffer()),
      name: f.name,
      type: f.type || undefined,
    })),
  );
}

/**
 * The landing-page hook: drop ANY file and start working immediately.
 * Word/images route straight to the right converter; PDFs get a one-tap
 * action chooser. Everything moves through the in-memory handoff store —
 * the file never leaves the device.
 */
export function UniversalDrop() {
  const router = useRouter();
  const put = useHandoff((s) => s.put);
  const putMany = useHandoff((s) => s.putMany);
  const [pending, setPending] = useState<HandoffDoc[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function onDrop(accepted: File[]) {
    if (accepted.length === 0) return;
    setBusy(true);
    try {
      const docs = await toDocs(accepted);
      const pdfs = docs.filter((d) => d.name.toLowerCase().endsWith('.pdf'));
      const images = docs.filter((d) => d.type?.startsWith('image/'));
      const docx = docs.find((d) => d.name.toLowerCase().endsWith('.docx'));

      if (images.length && !pdfs.length && !docx) {
        putMany(images);
        track('tool_used', 'landing-drop:images');
        router.push('/convert/images-to-pdf');
      } else if (docx && !pdfs.length) {
        put(docx);
        track('tool_used', 'landing-drop:docx');
        router.push('/convert/docx-to-pdf');
      } else if (pdfs.length > 1) {
        // Several PDFs almost always means "combine them".
        putMany(pdfs);
        track('tool_used', 'landing-drop:multi-pdf');
        router.push('/merge');
      } else if (pdfs.length === 1) {
        track('tool_used', 'landing-drop:pdf');
        setPending(pdfs);
      }
    } finally {
      setBusy(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: ACCEPT,
    multiple: true,
    noClick: !!pending,
    onDrop,
  });

  function go(slug: string) {
    if (!pending) return;
    putMany(pending);
    track('tool_used', `landing-drop:pdf->${slug}`);
    router.push(`/${slug}`);
  }

  return (
    <motion.div
      {...(getRootProps() as object)}
      className={cn(
        'relative w-full max-w-3xl overflow-hidden rounded-3xl border-2 border-dashed bg-[var(--surface)] px-6 py-10 text-center transition-colors',
        pending ? 'cursor-default border-[var(--brand)]' : 'cursor-pointer',
        isDragActive ? 'border-[var(--brand)]' : 'border-[var(--border)]',
        isDragReject && 'border-red-500',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300',
          (isDragActive || pending) && 'opacity-100',
        )}
        style={{
          background:
            'radial-gradient(70% 70% at 50% 35%, color-mix(in oklch, var(--grad-via) 16%, transparent), transparent)',
        }}
      />
      <input
        {...getInputProps({
          'aria-label':
            'Drop a PDF, Word document or images to start. Your files never leave this device.',
        })}
      />

      {!pending ? (
        <div className="relative flex flex-col items-center gap-3">
          <motion.span
            animate={isDragActive ? { y: -4, scale: 1.05 } : { y: 0, scale: 1 }}
            className="grid size-14 place-items-center rounded-2xl gradient-brand text-white shadow-lg"
          >
            <UploadCloud className="size-6" />
          </motion.span>
          <p className="text-lg font-semibold">
            {isDragReject
              ? 'That file type is not supported'
              : busy
                ? 'Reading your file…'
                : 'Drop any file to start — PDF, Word or images'}
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            We’ll open the right tool instantly. Nothing is uploaded — it all happens on your device.
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2">
            <FileText className="size-4 text-[var(--brand)]" />
            <span className="max-w-[16rem] truncate text-sm font-medium">{pending[0]!.name}</span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {formatBytes(pending[0]!.bytes.byteLength)}
            </span>
          </div>
          <p className="text-base font-semibold">What do you want to do with it?</p>
          <div className="flex max-w-xl flex-wrap justify-center gap-2">
            {PDF_ACTIONS.map((a) => (
              <button
                key={a.slug}
                type="button"
                onClick={(e) => { e.stopPropagation(); go(a.slug); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-sm font-medium transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <a.icon className="size-4" /> {a.label} <ArrowRight className="size-3" />
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setPending(null); }}
          >
            Choose a different file
          </Button>
        </div>
      )}
    </motion.div>
  );
}
