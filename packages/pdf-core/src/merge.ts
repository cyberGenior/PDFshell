import { PDFDocument } from 'pdf-lib';
import type { PdfInput } from './types.js';
import { loadDocument } from './internal.js';

export interface MergeOptions {
  /**
   * When true, the merged document keeps the metadata of the first input.
   * When false (default), fresh metadata is written.
   */
  preserveFirstMetadata?: boolean;
}

/**
 * Merge multiple PDFs into a single document, in the order supplied.
 *
 * Runs entirely in-memory — no file ever leaves the caller's environment,
 * which is the whole point of PDFShell.
 *
 * @param inputs Two or more PDFs as raw bytes.
 * @returns The merged PDF as bytes.
 */
export async function mergePdfs(
  inputs: PdfInput[],
  options: MergeOptions = {},
): Promise<Uint8Array> {
  if (inputs.length < 2) {
    throw new Error('mergePdfs requires at least two input documents.');
  }

  const out = await PDFDocument.create();

  for (const input of inputs) {
    const src = await loadDocument(input);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) out.addPage(page);
  }

  if (options.preserveFirstMetadata) {
    const first = await loadDocument(inputs[0]!);
    out.setTitle(first.getTitle() ?? '');
    out.setAuthor(first.getAuthor() ?? '');
    out.setSubject(first.getSubject() ?? '');
  }

  return out.save();
}

/** A single page picked from one of the source documents. */
export interface PagePick {
  /** Index into the `sources` array. */
  sourceIndex: number;
  /** 1-based page number within that source. */
  pageNumber: number;
}

/**
 * Assemble an arbitrary, ordered selection of pages drawn from multiple source
 * PDFs into one document. This powers page-level merge: the caller can
 * interleave, reorder and drop individual pages across documents.
 *
 * Each source is parsed once; pages are appended in exactly the order given.
 */
export async function assemblePages(
  sources: PdfInput[],
  picks: PagePick[],
): Promise<Uint8Array> {
  if (picks.length === 0) throw new Error('assemblePages requires at least one page.');

  const docs = await Promise.all(sources.map((s) => loadDocument(s)));
  const out = await PDFDocument.create();

  for (const { sourceIndex, pageNumber } of picks) {
    const src = docs[sourceIndex];
    if (!src) throw new Error(`No source document at index ${sourceIndex}.`);
    if (pageNumber < 1 || pageNumber > src.getPageCount()) {
      throw new Error(`Page ${pageNumber} is out of range for source ${sourceIndex}.`);
    }
    const [copied] = await out.copyPages(src, [pageNumber - 1]);
    out.addPage(copied!);
  }

  return out.save();
}
