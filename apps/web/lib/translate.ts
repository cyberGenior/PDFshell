import { CONVERT_BASE, ServiceUnavailableError } from '@/lib/libreoffice';

export interface LangInfo {
  code: string;
  name: string;
}

/** Installed Argos languages (the "language bank") for the source/target pickers. */
export async function getLanguages(): Promise<LangInfo[]> {
  try {
    const r = await fetch(`${CONVERT_BASE}/translate/langs`);
    if (!r.ok) return [];
    return ((await r.json()).installed ?? []) as LangInfo[];
  } catch {
    return [];
  }
}

export interface TranslateResult {
  bytes: Uint8Array;
  /** ISO code the engine detected (or echoed back) as the source language. */
  detected: string;
}

/**
 * Translate a PDF or image on the self-hosted service. Returns the translated PDF
 * (layout kept in place) plus the detected source language.
 */
export async function translateDocument(
  file: File,
  target: string,
  source = 'auto',
): Promise<TranslateResult> {
  const sourceExt = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
  let res: Response;
  try {
    res = await fetch(`${CONVERT_BASE}/translate?target=${target}&source=${source}`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream', 'x-source-ext': sourceExt },
      body: await file.arrayBuffer(),
    });
  } catch {
    throw new ServiceUnavailableError();
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new ServiceUnavailableError();
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Translation failed (${res.status}). ${detail}`.trim());
  }
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    detected: res.headers.get('x-detected-lang') ?? '',
  };
}
