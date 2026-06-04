/**
 * Compression presets.
 *
 * NOTE: PDFShell deliberately does NOT use Ghostscript (AGPL-3.0, 15.8 MB WASM)
 * — see docs/decisions/0001-compress-without-ghostscript.md. We keep the
 * familiar screen/ebook/printer naming, but here a preset is the target DPI +
 * JPEG quality used by the *opt-in* image-flatten path (the lossless path
 * ignores them).
 */
export type CompressionPreset = 'screen' | 'ebook' | 'printer' | 'prepress';

/** Balanced default, mirroring the spec's recommendation. */
export const DEFAULT_PRESET: CompressionPreset = 'ebook';

export interface PresetInfo {
  /** Target raster resolution for the flatten path. */
  dpi: number;
  /** JPEG quality 0..1 for re-encoded page images. */
  jpegQuality: number;
  label: string;
  description: string;
}

export const PRESETS: Record<CompressionPreset, PresetInfo> = {
  screen: {
    dpi: 72,
    jpegQuality: 0.6,
    label: 'Screen',
    description: 'Smallest, 72 dpi. Best for on-screen viewing and email.',
  },
  ebook: {
    dpi: 150,
    jpegQuality: 0.75,
    label: 'eBook',
    description: 'Balanced, 150 dpi. Recommended for most documents.',
  },
  printer: {
    dpi: 300,
    jpegQuality: 0.85,
    label: 'Printer',
    description: 'High quality, 300 dpi. Good for printing.',
  },
  prepress: {
    dpi: 300,
    jpegQuality: 0.92,
    label: 'Prepress',
    description: 'Highest quality, 300 dpi.',
  },
};
