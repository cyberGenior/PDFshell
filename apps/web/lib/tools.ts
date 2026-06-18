import {
  Pencil,
  ScanText,
  Minimize2,
  Combine,
  Scissors,
  ArrowLeftRight,
  RotateCw,
  Hash,
  Droplets,
  Crop,
  Lock,
  ScanLine,
  Eraser,
  type LucideIcon,
} from 'lucide-react';

export interface ToolMeta {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** Roadmap phase from the architecture spec. */
  phase: 1 | 2 | 3 | 4;
  /** Whether the tool is implemented yet (Phase 1 ships Merge + Split). */
  ready: boolean;
}

/** The six core tools, in the order shown on the landing page. */
export const TOOLS: ToolMeta[] = [
  {
    slug: 'merge',
    name: 'Organize & Merge',
    tagline: 'Reorder pages & combine PDFs',
    description:
      'Drag pages into any order — reorganise a single PDF, or add several and merge them into one.',
    icon: Combine,
    phase: 1,
    ready: true,
  },
  {
    slug: 'split',
    name: 'Split',
    tagline: 'Extract pages & ranges',
    description: 'Extract pages or page ranges into separate files. Batch export supported.',
    icon: Scissors,
    phase: 1,
    ready: true,
  },
  {
    slug: 'compress',
    name: 'Compress',
    tagline: 'Shrink file size',
    description: 'Reduce file size — lossless re-optimise, or flatten scans to images.',
    icon: Minimize2,
    phase: 2,
    ready: true,
  },
  {
    slug: 'edit',
    name: 'Edit',
    tagline: 'Add text on the page',
    description: 'Add text anywhere on a PDF — drag to place, and match the document’s own font.',
    icon: Pencil,
    phase: 1,
    ready: true,
  },
  {
    slug: 'scan',
    name: 'Scan to PDF',
    tagline: 'Photos of pages → clean PDF',
    description: 'Snap photos of your documents and turn them into a clean, scanner-style PDF — right on your phone.',
    icon: ScanLine,
    phase: 3,
    ready: true,
  },
  {
    slug: 'ocr',
    name: 'OCR',
    tagline: 'Text from scans',
    description: 'Extract text from scanned PDFs. 100+ languages, fully in-browser.',
    icon: ScanText,
    phase: 3,
    ready: true,
  },
  {
    slug: 'convert',
    name: 'Convert',
    tagline: 'DOCX & images → PDF',
    description: 'DOCX → PDF and images (JPG, PNG) → PDF. Client-side only.',
    icon: ArrowLeftRight,
    phase: 3,
    ready: true,
  },
  {
    slug: 'rotate',
    name: 'Rotate',
    tagline: 'Turn pages the right way up',
    description: 'Rotate single pages or the whole document by 90° — entirely on your device.',
    icon: RotateCw,
    phase: 4,
    ready: true,
  },
  {
    slug: 'page-numbers',
    name: 'Page numbers',
    tagline: 'Stamp page numbers',
    description: 'Add page numbers in any corner or centre, with custom format and start number.',
    icon: Hash,
    phase: 4,
    ready: true,
  },
  {
    slug: 'watermark',
    name: 'Watermark',
    tagline: 'Stamp text across pages',
    description: 'Add a diagonal text watermark like DRAFT or CONFIDENTIAL — private, in-browser.',
    icon: Droplets,
    phase: 4,
    ready: true,
  },
  {
    slug: 'crop',
    name: 'Crop',
    tagline: 'Trim page margins',
    description: 'Trim margins off every page with a live preview. Runs on your device.',
    icon: Crop,
    phase: 4,
    ready: true,
  },
  {
    slug: 'protect',
    name: 'Protect & Unlock',
    tagline: 'Password-protect or unlock',
    description: 'Add AES-256 password protection to a PDF, or remove a password you know.',
    icon: Lock,
    phase: 4,
    ready: true,
  },
  {
    slug: 'redact',
    name: 'Redact',
    tagline: 'Permanently remove content',
    description: 'Black out text or images and permanently delete them — the hidden content can’t be copied or recovered.',
    icon: Eraser,
    phase: 4,
    ready: true,
  },
];

export function getTool(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
