'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Eraser, Upload, X } from 'lucide-react';

interface SignaturePadProps {
  onClose: () => void;
  /** Called with the trimmed PNG and its natural width/height ratio (w / h). */
  onComplete: (png: Uint8Array, aspect: number) => void;
}

const PAD_W = 600;
const PAD_H = 220;

/** Crop fully-transparent margins off a canvas; return the cropped canvas (or null if blank). */
function trim(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width, minY = height, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 8) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  const pad = 8;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d')!.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  return out;
}

function toPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error('encode failed'))), 'image/png'),
  );
}

/** A draw-or-upload signature capture dialog. Produces a transparent PNG. */
export function SignaturePad({ onClose, onComplete }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);
  const uploadRef = useRef<HTMLInputElement>(null);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * PAD_W,
      y: ((e.clientY - rect.top) / rect.height) * PAD_H,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  }

  function end() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.clearRect(0, 0, PAD_W, PAD_H);
    setEmpty(true);
  }

  async function useDrawn() {
    const trimmed = trim(canvasRef.current!);
    if (!trimmed) return;
    onComplete(await toPngBytes(trimmed), trimmed.width / trimmed.height);
  }

  async function useUpload(file: File) {
    const bitmap = await createImageBitmap(file);
    const c = document.createElement('canvas');
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext('2d')!.drawImage(bitmap, 0, 0);
    bitmap.close();
    // Trim only helps for already-transparent PNGs; for opaque photos it's a no-op.
    const trimmed = trim(c) ?? c;
    onComplete(await toPngBytes(trimmed), trimmed.width / trimmed.height);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add your signature</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-[var(--surface-2)]">
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-2 text-sm text-[var(--muted-foreground)]">Draw with your mouse or finger, or upload an image of your signature.</p>

        <canvas
          ref={canvasRef}
          width={PAD_W}
          height={PAD_H}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="aspect-[600/220] w-full touch-none rounded-xl border border-dashed border-[var(--border)] bg-white"
          style={{ cursor: 'crosshair' }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={useDrawn} disabled={empty}>Use signature</Button>
          <Button variant="ghost" onClick={clear} disabled={empty}><Eraser /> Clear</Button>
          <div className="ml-auto">
            <Button variant="outline" onClick={() => uploadRef.current?.click()}><Upload /> Upload image</Button>
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void useUpload(f); e.target.value = ''; }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
