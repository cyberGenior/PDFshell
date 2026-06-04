import 'server-only';
import { getDb } from './db';
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

export function listModels(): ModelView[] {
  const rows = getDb()
    .prepare('SELECT id, label, provider, base_url, model, api_key_enc, is_active FROM ai_models ORDER BY id')
    .all() as unknown as Array<{
      id: number; label: string; provider: string; base_url: string; model: string; api_key_enc: string | null; is_active: number;
    }>;
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    provider: r.provider,
    base_url: r.base_url,
    model: r.model,
    is_active: r.is_active,
    key_masked: r.api_key_enc ? maskKey(decryptSafe(r.api_key_enc)) : '',
  }));
}

function decryptSafe(blob: string): string {
  try {
    return decrypt(blob);
  } catch {
    return '';
  }
}

export function createModel(input: ModelInput): number {
  const db = getDb();
  const enc = input.apiKey ? encrypt(input.apiKey) : null;
  const info = db
    .prepare('INSERT INTO ai_models (label, provider, base_url, model, api_key_enc) VALUES (?, ?, ?, ?, ?)')
    .run(input.label, input.provider, input.baseUrl, input.model, enc);
  const id = Number(info.lastInsertRowid);
  // First model becomes active automatically.
  const count = db.prepare('SELECT COUNT(*) c FROM ai_models').get() as { c: number };
  if (count.c === 1) activateModel(id);
  return id;
}

export function deleteModel(id: number): void {
  getDb().prepare('DELETE FROM ai_models WHERE id = ?').run(id);
}

export function activateModel(id: number): void {
  const db = getDb();
  db.prepare('UPDATE ai_models SET is_active = 0').run();
  db.prepare('UPDATE ai_models SET is_active = 1 WHERE id = ?').run(id);
}

export function getActiveModel(): ActiveModel | null {
  const r = getDb()
    .prepare('SELECT provider, base_url, model, api_key_enc FROM ai_models WHERE is_active = 1 LIMIT 1')
    .get() as { provider: string; base_url: string; model: string; api_key_enc: string | null } | undefined;
  if (!r) return null;
  return { provider: r.provider, baseUrl: r.base_url, model: r.model, apiKey: r.api_key_enc ? decryptSafe(r.api_key_enc) : '' };
}

/** Lightweight reachability check per provider. */
export async function testModel(id: number): Promise<{ ok: boolean; detail: string }> {
  const r = getDb()
    .prepare('SELECT provider, base_url, model, api_key_enc FROM ai_models WHERE id = ?')
    .get(id) as { provider: string; base_url: string; model: string; api_key_enc: string | null } | undefined;
  if (!r) return { ok: false, detail: 'Model not found.' };
  const apiKey = r.api_key_enc ? decryptSafe(r.api_key_enc) : '';
  try {
    if (r.provider === 'ollama') {
      const res = await fetch(`${r.base_url.replace(/\/$/, '')}/api/tags`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return { ok: false, detail: `Ollama responded ${res.status}` };
      const data = (await res.json()) as { models?: { name: string }[] };
      const has = data.models?.some((m) => m.name === r.model);
      return { ok: true, detail: has ? `Reachable; "${r.model}" is installed.` : `Reachable, but "${r.model}" not pulled yet.` };
    }
    // OpenAI-compatible (openai/custom) and anthropic: hit a cheap list endpoint.
    const url = r.provider === 'anthropic' ? `${r.base_url.replace(/\/$/, '')}/v1/models` : `${r.base_url.replace(/\/$/, '')}/v1/models`;
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
