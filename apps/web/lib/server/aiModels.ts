import 'server-only';
import { q, q1 } from './db';
import { encrypt, decrypt, maskKey } from './crypto';

export type Provider = 'ollama' | 'openai' | 'anthropic' | 'custom';

export interface ModelInput {
  label: string;
  provider: Provider;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export interface ModelView {
  id: number;
  label: string;
  provider: string;
  base_url: string;
  model: string;
  key_masked: string;
  is_active: number;
}

export interface ActiveModel {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

interface ModelRow {
  id: number;
  label: string;
  provider: string;
  base_url: string;
  model: string;
  api_key_enc: string | null;
  is_active: number;
}

async function decryptSafe(blob: string): Promise<string> {
  try {
    return await decrypt(blob);
  } catch {
    return '';
  }
}

export async function listModels(): Promise<ModelView[]> {
  const rows = await q<ModelRow>(
    'SELECT id, label, provider, base_url, model, api_key_enc, is_active FROM ai_models ORDER BY id',
  );
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      label: r.label,
      provider: r.provider,
      base_url: r.base_url,
      model: r.model,
      is_active: r.is_active,
      key_masked: r.api_key_enc ? maskKey(await decryptSafe(r.api_key_enc)) : '',
    })),
  );
}

export async function createModel(input: ModelInput): Promise<number> {
  const enc = input.apiKey ? await encrypt(input.apiKey) : null;
  const row = await q1<{ id: number }>(
    'INSERT INTO ai_models (label, provider, base_url, model, api_key_enc) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [input.label, input.provider, input.baseUrl, input.model, enc],
  );
  const id = row!.id;
  // First model becomes active automatically.
  const count = await q1<{ c: number }>('SELECT COUNT(*)::int AS c FROM ai_models');
  if (count!.c === 1) await activateModel(id);
  return id;
}

export async function deleteModel(id: number): Promise<void> {
  await q('DELETE FROM ai_models WHERE id = $1', [id]);
}

export async function activateModel(id: number): Promise<void> {
  await q('UPDATE ai_models SET is_active = 0', []);
  await q('UPDATE ai_models SET is_active = 1 WHERE id = $1', [id]);
}

export async function getActiveModel(): Promise<ActiveModel | null> {
  const r = await q1<ModelRow>(
    'SELECT provider, base_url, model, api_key_enc FROM ai_models WHERE is_active = 1 LIMIT 1',
  );
  if (!r) return null;
  return {
    provider: r.provider,
    baseUrl: r.base_url,
    model: r.model,
    apiKey: r.api_key_enc ? await decryptSafe(r.api_key_enc) : '',
  };
}

/** Lightweight reachability check per provider. */
export async function testModel(id: number): Promise<{ ok: boolean; detail: string }> {
  const r = await q1<ModelRow>(
    'SELECT provider, base_url, model, api_key_enc FROM ai_models WHERE id = $1',
    [id],
  );
  if (!r) return { ok: false, detail: 'Model not found.' };
  const apiKey = r.api_key_enc ? await decryptSafe(r.api_key_enc) : '';
  try {
    if (r.provider === 'ollama') {
      const res = await fetch(`${r.base_url.replace(/\/$/, '')}/api/tags`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return { ok: false, detail: `Ollama responded ${res.status}` };
      const data = (await res.json()) as { models?: { name: string }[] };
      const has = data.models?.some((m) => m.name === r.model);
      return { ok: true, detail: has ? `Reachable; "${r.model}" is installed.` : `Reachable, but "${r.model}" not pulled yet.` };
    }
    // OpenAI-compatible (openai/custom) and anthropic: hit a cheap list endpoint.
    const url = `${r.base_url.replace(/\/$/, '')}/v1/models`;
    const headers: Record<string, string> = {};
    if (r.provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['authorization'] = `Bearer ${apiKey}`;
    }
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    return res.ok
      ? { ok: true, detail: 'Reachable and authorized.' }
      : { ok: false, detail: `Provider responded ${res.status}.` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'Unreachable.' };
  }
}
