import type { PdfInput, PdfMetadata } from './types.js';
import { loadDocument } from './internal.js';

/** Read the editable metadata fields from a PDF. */
export async function getMetadata(input: PdfInput): Promise<PdfMetadata> {
  const doc = await loadDocument(input);
  const keywords = doc.getKeywords();
  return {
    title: doc.getTitle() ?? undefined,
    author: doc.getAuthor() ?? undefined,
    subject: doc.getSubject() ?? undefined,
    // pdf-lib serialises the keyword array space-separated, so accept commas,
    // semicolons and whitespace as separators when reading back.
    keywords: keywords ? keywords.split(/[,;\s]+/).filter(Boolean) : undefined,
    creator: doc.getCreator() ?? undefined,
    producer: doc.getProducer() ?? undefined,
  };
}

/**
 * Apply metadata to a PDF, returning the updated bytes.
 * Only the fields present on `meta` are written; others are left untouched.
 */
export async function setMetadata(
  input: PdfInput,
  meta: PdfMetadata,
): Promise<Uint8Array> {
  const doc = await loadDocument(input);

  if (meta.title !== undefined) doc.setTitle(meta.title);
  if (meta.author !== undefined) doc.setAuthor(meta.author);
  if (meta.subject !== undefined) doc.setSubject(meta.subject);
  if (meta.keywords !== undefined) doc.setKeywords(meta.keywords);
  if (meta.creator !== undefined) doc.setCreator(meta.creator);
  if (meta.producer !== undefined) doc.setProducer(meta.producer);

  return doc.save();
}

/** Convenience helper: total page count of a PDF. */
export async function getPageCount(input: PdfInput): Promise<number> {
  const doc = await loadDocument(input);
  return doc.getPageCount();
}
