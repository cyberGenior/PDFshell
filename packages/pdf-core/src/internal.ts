import { PDFDocument } from 'pdf-lib';
import type { PdfInput } from './types.js';

/** Normalise any accepted input form to the Uint8Array pdf-lib expects. */
export function toBytes(input: PdfInput): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

/**
 * Load a PDF document. `ignoreEncryption` is on by default so that the toolkit
 * degrades gracefully on lightly-protected files rather than throwing outright.
 */
export async function loadDocument(input: PdfInput): Promise<PDFDocument> {
  return PDFDocument.load(toBytes(input), { ignoreEncryption: true });
}
