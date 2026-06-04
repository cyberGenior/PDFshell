/**
 * Client for the self-hosted LibreOffice conversion service (see
 * services/convert). Unlike the on-device tools, this uploads the file to your
 * own server, which runs LibreOffice headless and returns the converted file.
 *
 * The base URL is baked at build time via NEXT_PUBLIC_CONVERT_URL. When unset
 * (the all-in-one image), it defaults to the same-origin "/svc" proxy, which the
 * Next server rewrites to the internal convert service — so only one port is
 * exposed and there's nothing extra to configure.
 */
export const CONVERT_BASE =
  process.env.NEXT_PUBLIC_CONVERT_URL ?? '/svc';

export type ConvertTarget = 'pdf' | 'docx' | 'xlsx' | 'pptx';

/** Thrown when the conversion service can't be reached (not started). */
export class ServiceUnavailableError extends Error {
  constructor() {
    super('The LibreOffice conversion service is not reachable.');
    this.name = 'ServiceUnavailableError';
  }
}

export type CompressPreset = 'screen' | 'ebook' | 'printer';

/** Compress a PDF on the self-hosted service (Ghostscript). Never inflates. */
export async function compressViaService(
  file: File,
  preset: CompressPreset,
): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(`${CONVERT_BASE}/compress?preset=${preset}`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: await file.arrayBuffer(),
    });
  } catch {
    throw new ServiceUnavailableError();
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Compression failed (${res.status}). ${detail}`.trim());
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** Is the local Ollama model reachable for AI enhancement? */
export async function aiStatus(): Promise<{ available: boolean; model: string }> {
  try {
    const r = await fetch(`${CONVERT_BASE}/ai-status`);
    if (!r.ok) return { available: false, model: '' };
    return (await r.json()) as { available: boolean; model: string };
  } catch {
    return { available: false, model: '' };
  }
}

export async function convertViaLibreOffice(
  file: File,
  target: ConvertTarget,
  opts: { ai?: boolean } = {},
): Promise<Uint8Array> {
  const sourceExt = file.name.split('.').pop()?.toLowerCase() ?? '';
  const aiParam = opts.ai ? '&ai=1' : '';
  let res: Response;
  try {
    res = await fetch(`${CONVERT_BASE}/convert?target=${target}${aiParam}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'x-source-ext': sourceExt,
      },
      body: await file.arrayBuffer(),
    });
  } catch {
    throw new ServiceUnavailableError();
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Conversion failed (${res.status}). ${detail}`.trim());
  }
  return new Uint8Array(await res.arrayBuffer());
}
