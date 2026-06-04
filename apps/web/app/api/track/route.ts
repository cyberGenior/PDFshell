import { NextResponse } from 'next/server';
import { recordEvent } from '@/lib/server/track';

export const runtime = 'nodejs';

// Public ingest endpoint for the client analytics beacon. Best-effort: never
// fails the caller (tracking must not break the app).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await recordEvent(body, req.headers);
  } catch {
    /* swallow — analytics is non-critical */
  }
  return NextResponse.json({ ok: true });
}
