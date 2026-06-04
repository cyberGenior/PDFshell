import { NextResponse } from 'next/server';
import { getActiveModel } from '@/lib/server/aiModels';

export const runtime = 'nodejs';

/**
 * Internal endpoint for the conversion service to fetch the admin-selected
 * active AI model (including the decrypted key). Protected by a shared secret —
 * only reachable on the internal network with the right token.
 */
export async function GET(req: Request) {
  const token = process.env.PDFSHELL_INTERNAL_TOKEN ?? 'pdfshell-internal';
  if (req.headers.get('x-internal-token') !== token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const active = getActiveModel();
  if (!active) return NextResponse.json({ active: null });
  return NextResponse.json({ active });
}
