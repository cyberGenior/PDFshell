import {
  Image as ImageIcon,
  FileText,
  FileType2,
  FileImage,
  FileSpreadsheet,
  Presentation,
  FileDown,
  type LucideIcon,
} from 'lucide-react';

/**
 * Where a conversion runs:
 *  - 'client'      → entirely in the browser (free, private, offline)
 *  - 'libreoffice' → needs the self-hosted LibreOffice service (a backend; the
 *                    file is processed on your server, not the user's device)
 */
export type ConversionEngine = 'client' | 'libreoffice';

export interface Conversion {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  engine: ConversionEngine;
  ready: boolean;
}

export const CONVERSIONS: Conversion[] = [
  {
    slug: 'images-to-pdf',
    title: 'Images → PDF',
    description: 'Combine JPG/PNG/WebP images into one PDF, one image per page.',
    icon: ImageIcon,
    engine: 'client',
    ready: true,
  },
  {
    slug: 'pdf-to-images',
    title: 'PDF → Images',
    description: 'Export each page as a PNG or JPG, downloaded together as a ZIP.',
    icon: FileImage,
    engine: 'client',
    ready: true,
  },
  {
    slug: 'pdf-to-text',
    title: 'PDF → Text',
    description: 'Extract the selectable text from a PDF into a .txt file.',
    icon: FileText,
    engine: 'client',
    ready: true,
  },
  {
    slug: 'docx-to-pdf',
    title: 'Word → PDF',
    description: 'Convert .docx to PDF with fonts, tables, images and layout preserved.',
    icon: FileType2,
    engine: 'libreoffice',
    ready: true,
  },
  {
    slug: 'pdf-to-word',
    title: 'PDF → Word',
    description: 'Reconstruct an editable .docx using the self-hosted LibreOffice service.',
    icon: FileDown,
    engine: 'libreoffice',
    ready: true,
  },
  {
    slug: 'pdf-to-excel',
    title: 'PDF → Excel',
    description: 'Extract tables to a .xlsx via the self-hosted LibreOffice service.',
    icon: FileSpreadsheet,
    engine: 'libreoffice',
    ready: true,
  },
  {
    slug: 'pdf-to-powerpoint',
    title: 'PDF → PowerPoint',
    description: 'Turn pages into slides (.pptx) via the self-hosted LibreOffice service.',
    icon: Presentation,
    engine: 'libreoffice',
    ready: true,
  },
];

export function getConversion(slug: string): Conversion | undefined {
  return CONVERSIONS.find((c) => c.slug === slug);
}
