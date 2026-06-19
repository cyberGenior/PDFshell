import { CONVERT_BASE, ServiceUnavailableError } from '@/lib/libreoffice';

/** A redaction rectangle in PDF points (top-left origin), per page. */
export interface RedactBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RedactPage {
  page: number; // 0-based
  boxes: RedactBox[];
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

/**
 * Permanently redact regions of a PDF on the self-hosted service. Unlike a black
 * box drawn client-side, this REMOVES the underlying text/graphics so it can't be
 * copied or recovered (PyMuPDF apply_redactions).
 */
export async function redactPdf(pdf: Uint8Array, pages: RedactPage[]): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(`${CONVERT_BASE}/redact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pdf: toBase64(pdf), pages }),
    });
  } catch {
    throw new ServiceUnavailableError();
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new ServiceUnavailableError();
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Redaction failed (${res.status}). ${detail}`.trim());
  }
  return new Uint8Array(await res.arrayBuffer());
}
