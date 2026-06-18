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
  signal?: AbortSignal,
): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(`${CONVERT_BASE}/compress?preset=${preset}`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: await file.arrayBuffer(),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ServiceUnavailableError();
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Compression failed (${res.status}). ${detail}`.trim());
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** Thrown when the service rejects the supplied PDF password. */
export class WrongPasswordError extends Error {
  constructor() {
    super('That password is not correct for this PDF.');
    this.name = 'WrongPasswordError';
  }
}

/** Which actions a protected PDF permits (omit a key to forbid it). */
export type PdfPermission = 'print' | 'copy' | 'modify' | 'annotate';

export interface ProtectOptions {
  /** Owner password (to change permissions). Must differ from the open password
   *  for restrictions to take effect. */
  ownerPassword?: string;
  /** Allowed actions. Omit to allow everything (the historical default). */
  permissions?: PdfPermission[];
}

async function passwordOp(
  path: 'protect' | 'unlock',
  file: File,
  password: string,
  signal?: AbortSignal,
  opts?: ProtectOptions,
): Promise<Uint8Array> {
  const headers: Record<string, string> = {
    'content-type': 'application/octet-stream',
    // Header (not query string) so the password never lands in URL logs.
    'x-password': encodeURIComponent(password),
  };
  if (opts?.ownerPassword) headers['x-owner-password'] = encodeURIComponent(opts.ownerPassword);
  if (opts?.permissions) headers['x-permissions'] = opts.permissions.join(',');

  let res: Response;
  try {
    res = await fetch(`${CONVERT_BASE}/${path}`, {
      method: 'POST',
      headers,
      body: await file.arrayBuffer(),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ServiceUnavailableError();
  }
  if (res.status === 401) throw new WrongPasswordError();
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Operation failed (${res.status}). ${detail}`.trim());
  }
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Encrypt a PDF with AES-256 so it requires `password` to open. Optionally set a
 * separate owner password and restrict permissions (print/copy/modify/annotate).
 */
export function protectViaService(
  file: File,
  password: string,
  opts?: ProtectOptions,
  signal?: AbortSignal,
) {
  return passwordOp('protect', file, password, signal, opts);
}

/** Remove encryption from a PDF, given its correct password. */
export function unlockViaService(file: File, password: string, signal?: AbortSignal) {
  return passwordOp('unlock', file, password, signal);
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
