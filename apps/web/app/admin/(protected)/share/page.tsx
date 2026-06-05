'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

const HOST = SITE_URL.replace(/^https?:\/\//, '');
const DEFAULT_CAPTION =
  `${SITE_NAME} — free, private PDF tools that run in your browser. Merge, split, edit, OCR & convert PDFs — nothing uploaded, no sign-up.`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lh;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
  return y + lh;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function SharePage() {
  const landscape = useRef<HTMLCanvasElement>(null);
  const square = useRef<HTMLCanvasElement>(null);
  const [caption, setCaption] = useState(DEFAULT_CAPTION);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback((key: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cover, icon] = await Promise.all([
        loadImage('/share/cover.jpg').catch(() => null),
        loadImage('/share/icon.jpg').catch(() => null),
      ]);
      if (!alive) return;

      // ── Landscape 1200×630 (Open Graph / X / Facebook / LinkedIn) ──
      const lc = landscape.current;
      if (lc) {
        const ctx = lc.getContext('2d')!;
        const W = 1200, H = 630;
        if (cover) ctx.drawImage(cover, 0, 0, W, H);
        else { ctx.fillStyle = '#4f46e5'; ctx.fillRect(0, 0, W, H); }
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(24,12,48,0.10)');
        g.addColorStop(0.55, 'rgba(24,12,48,0.35)');
        g.addColorStop(1, 'rgba(20,10,40,0.88)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'alphabetic';
        ctx.font = 'bold 70px system-ui, sans-serif';
        wrapText(ctx, 'Free, private PDF tools', 64, 430, 900, 78);
        ctx.font = '500 34px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        wrapText(ctx, 'Merge · Split · Edit · OCR · Convert — in your browser. Nothing uploaded.', 64, 500, 1000, 44);
        // URL pill
        ctx.font = '600 30px system-ui, sans-serif';
        const pw = ctx.measureText(HOST).width + 56;
        roundRect(ctx, 64, 540, pw, 56, 28);
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(HOST, 92, 577);
      }

      // ── Square 1080×1080 (Instagram / WhatsApp status) ──
      const sc = square.current;
      if (sc) {
        const ctx = sc.getContext('2d')!;
        const S = 1080;
        const g = ctx.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, '#4f46e5');
        g.addColorStop(0.55, '#7c3aed');
        g.addColorStop(1, '#9333ea');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);

        if (icon) {
          const sz = 360, ix = (S - sz) / 2, iy = 165;
          ctx.save();
          roundRect(ctx, ix, iy, sz, sz, 64);
          ctx.clip();
          ctx.drawImage(icon, ix, iy, sz, sz);
          ctx.restore();
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 96px system-ui, sans-serif';
        ctx.fillText(SITE_NAME, S / 2, 680);
        ctx.font = '600 44px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillText('Free, private PDF tools', S / 2, 752);
        ctx.font = '500 36px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('Merge · Edit · OCR · Convert — in your browser', S / 2, 812);
        // URL pill
        ctx.font = '600 36px system-ui, sans-serif';
        const pw = ctx.measureText(HOST).width + 64;
        roundRect(ctx, (S - pw) / 2, 900, pw, 64, 32);
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(HOST, S / 2, 943);
      }
    })();
    return () => { alive = false; };
  }, []);

  function download(ref: React.RefObject<HTMLCanvasElement | null>, name: string) {
    const c = ref.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  const u = encodeURIComponent(SITE_URL);
  const t = encodeURIComponent(caption);
  const shares: { label: string; href: string; cls: string }[] = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}`, cls: 'bg-[#25D366]' },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, cls: 'bg-black' },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, cls: 'bg-[#1877F2]' },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, cls: 'bg-[#0A66C2]' },
    { label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}`, cls: 'bg-[#229ED9]' },
    { label: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}`, cls: 'bg-[#FF4500]' },
    { label: 'Email', href: `mailto:?subject=${encodeURIComponent(SITE_NAME)}&body=${t}%20${u}`, cls: 'bg-[var(--muted-foreground)]' },
  ];

  const embed = `<iframe src="${SITE_URL}/embed" width="100%" height="170" style="border:0;border-radius:16px;max-width:520px" loading="lazy" title="${SITE_NAME} — free PDF tools"></iframe>`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight">Share</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Generate branded covers, share to social, or embed PDFShell on any site.
        </p>
      </div>

      {/* Covers */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Cover title="Landscape · 1200×630" hint="Best for X, Facebook, LinkedIn, link previews">
          <canvas ref={landscape} width={1200} height={630} className="block w-full rounded-xl border border-[var(--border)]" />
          <Button onClick={() => download(landscape, 'pdfshell-cover-landscape.png')} className="mt-3">
            <Download className="size-4" /> Download PNG
          </Button>
        </Cover>
        <Cover title="Square · 1080×1080" hint="Best for Instagram, WhatsApp status">
          <canvas ref={square} width={1080} height={1080} className="mx-auto block w-full max-w-[360px] rounded-xl border border-[var(--border)]" />
          <Button onClick={() => download(square, 'pdfshell-cover-square.png')} className="mt-3">
            <Download className="size-4" /> Download PNG
          </Button>
        </Cover>
      </div>

      {/* Caption */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Share message</h2>
          <Button variant="outline" size="sm" onClick={() => copy('cap', caption)}>
            {copied === 'cap' ? <Check className="size-4" /> : <Copy className="size-4" />} Copy
          </Button>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {shares.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className={`rounded-full px-4 py-2 text-sm font-medium text-white ${s.cls}`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </section>

      {/* Link + embed */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="font-medium">Direct link</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Sharing this link shows the cover preview automatically.</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">{SITE_URL}</code>
            <Button variant="outline" size="sm" onClick={() => copy('link', SITE_URL)}>
              {copied === 'link' ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
            <a href={SITE_URL} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><ExternalLink className="size-4" /></Button></a>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Embed on a website</h2>
            <Button variant="outline" size="sm" onClick={() => copy('embed', embed)}>
              {copied === 'embed' ? <Check className="size-4" /> : <Copy className="size-4" />} Copy
            </Button>
          </div>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Paste this iframe into any blog or page.</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-3 text-xs">{embed}</pre>
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-sync-scripts */}
            <iframe src="/embed" width="100%" height={170} style={{ border: 0, borderRadius: 16, maxWidth: 520 }} title="PDFShell embed preview" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Cover({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="font-medium">{title}</h2>
      <p className="mb-3 text-xs text-[var(--muted-foreground)]">{hint}</p>
      {children}
    </div>
  );
}
