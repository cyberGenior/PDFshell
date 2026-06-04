import { NextResponse } from 'next/server';
import { getSessionAdmin, audit } from '@/lib/server/auth';
import { listModels, createModel, type Provider } from '@/lib/server/aiModels';

export const runtime = 'nodejs';

const PROVIDERS = new Set(['ollama', 'openai', 'anthropic', 'custom']);

export async function GET() {
  if (!(await getSessionAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ models: listModels() });
}

export async function POST(req: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const label = (b.label ?? '').trim();
  const provider = (b.provider ?? '') as Provider;
  const baseUrl = (b.baseUrl ?? '').trim();
  const model = (b.model ?? '').trim();
  if (!label || !PROVIDERS.has(provider) || !baseUrl || !model) {
    return NextResponse.json({ error: 'label, provider, baseUrl and model are required.' }, { status: 400 });
  }
  const id = createModel({ label, provider, baseUrl, model, apiKey: b.apiKey?.trim() || undefined });
  audit(admin.id, 'ai_model_create', `${provider}:${model}`);
  return NextResponse.json({ ok: true, id });
}
