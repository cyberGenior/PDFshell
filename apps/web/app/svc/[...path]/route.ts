import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // allow long CPU-AI conversions

const BASE = (process.env.INTERNAL_CONVERT_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');

/**
 * Same-origin proxy to the in-container conversion service. Used instead of a
 * Next rewrite because rewrites time out (~30s) on slow CPU-AI conversions; a
 * route handler streams the upstream response with no such cap.
 */
async function proxy(req: Request, path: string[]): Promise<Response> {
  const target = `${BASE}/${path.join('/')}${new URL(req.url).search}`;
  const headers: Record<string, string> = {};
  const ct = req.headers.get('content-type');
  const ext = req.headers.get('x-source-ext');
  if (ct) headers['content-type'] = ct;
  if (ext) headers['x-source-ext'] = ext;

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = Buffer.from(await req.arrayBuffer());
  }

  try {
    const res = await fetch(target, init);
    return new NextResponse(res.body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/octet-stream' },
    });
  } catch {
    return NextResponse.json({ error: 'Conversion service unreachable.' }, { status: 502 });
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await ctx.params).path);
}
