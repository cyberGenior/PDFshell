import { NextResponse } from 'next/server';
import { getSessionAdmin, audit } from '@/lib/server/auth';

export const runtime = 'nodejs';

const BASE = (process.env.INTERNAL_CONVERT_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
const TOKEN = process.env.PDFSHELL_INTERNAL_TOKEN ?? 'pdfshell-internal';

/** Admin-only proxy to the convert service's language-bank endpoints. */
export async function GET() {
  if (!(await getSessionAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const r = await fetch(`${BASE}/translate/available`);
    if (!r.ok) return NextResponse.json({ error: 'Language catalogue unavailable.' }, { status: 502 });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ error: 'Translation service unreachable.' }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const action = b.action === 'uninstall' ? 'uninstall' : 'install';
  const from = (b.from ?? '').trim().toLowerCase();
  const to = (b.to ?? '').trim().toLowerCase();
  if (!from || !to) return NextResponse.json({ error: 'from and to are required.' }, { status: 400 });

  try {
    const r = await fetch(`${BASE}/translate/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': TOKEN },
      body: JSON.stringify({ from, to }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return NextResponse.json({ error: detail || `${action} failed.` }, { status: 502 });
    }
    audit(admin.id, `lang_${action}`, `${from}->${to}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Translation service unreachable.' }, { status: 502 });
  }
}
