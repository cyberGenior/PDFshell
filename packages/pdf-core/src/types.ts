/**
 * Raw PDF bytes accepted by every pdf-core function.
 * Uint8Array is the canonical form; ArrayBuffer is accepted for convenience
 * (e.g. straight from File.arrayBuffer()).
 */
export type PdfInput = Uint8Array | ArrayBuffer;

/**
 * An inclusive, 1-based range of pages, e.g. { start: 1, end: 3 } -> pages 1,2,3.
 * A single page is expressed as { start: n, end: n }.
 */
export interface PageRange {
  /** 1-based, inclusive. */
  start: number;
  /** 1-based, inclusive. */
  end: number;
}

/** Editable document metadata exposed by getMetadata / setMetadata. */
export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
}
