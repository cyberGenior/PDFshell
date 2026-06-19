'use client';

import {
  PDFDocument,
  PDFName,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFTextField,
  PDFOptionList,
} from 'pdf-lib';

/**
 * Client-side AcroForm filling. Detects a PDF's interactive fields and their
 * on-page positions (via each widget's /P page ref — validated against pdf-lib's
 * behaviour), so the UI can place inputs exactly over the form. Filling and the
 * optional flatten also happen here, entirely in the browser — nothing uploaded.
 */
export type FieldKind = 'text' | 'checkbox' | 'dropdown' | 'radio';

/** One widget (visual instance) of a field, in PDF points with a top-left origin. */
export interface FieldWidget {
  page: number; // 0-based
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FormField {
  name: string;
  kind: FieldKind;
  widgets: FieldWidget[];
  options?: string[]; // dropdown / radio
  value?: string; // text / selected option
  checked?: boolean; // checkbox
  multiline?: boolean;
  readOnly?: boolean;
}

export interface FormInfo {
  pageCount: number;
  pageSizes: { width: number; height: number }[];
  fields: FormField[];
}

function kindOf(field: unknown): FieldKind | null {
  if (field instanceof PDFTextField) return 'text';
  if (field instanceof PDFCheckBox) return 'checkbox';
  if (field instanceof PDFDropdown || field instanceof PDFOptionList) return 'dropdown';
  if (field instanceof PDFRadioGroup) return 'radio';
  return null; // buttons, signatures — not fillable here
}

/** Read all fillable fields + their positions from a PDF. */
export async function extractForm(bytes: Uint8Array): Promise<FormInfo> {
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();
  const pageRefs = pages.map((p) => p.ref);
  const pageSizes = pages.map((p) => p.getSize());
  const form = doc.getForm();

  const fields: FormField[] = [];
  for (const field of form.getFields()) {
    const kind = kindOf(field);
    if (!kind) continue;
    const name = field.getName();

    const widgets: FieldWidget[] = [];
    for (const w of field.acroField.getWidgets()) {
      const r = w.getRectangle();
      const pRef = w.dict.get(PDFName.of('P'));
      let page = pageRefs.findIndex((ref) => ref === pRef);
      if (page < 0) page = 0;
      const ph = pageSizes[page]!.height;
      widgets.push({ page, x: r.x, y: ph - (r.y + r.height), w: r.width, h: r.height });
    }
    if (!widgets.length) continue;

    const f: FormField = { name, kind, widgets, readOnly: field.isReadOnly() };
    if (field instanceof PDFTextField) {
      f.value = field.getText() ?? '';
      f.multiline = field.isMultiline();
    } else if (field instanceof PDFCheckBox) {
      f.checked = field.isChecked();
    } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
      f.options = field.getOptions();
      f.value = field.getSelected()[0] ?? '';
    } else if (field instanceof PDFRadioGroup) {
      f.options = field.getOptions();
      f.value = field.getSelected() ?? '';
    }
    fields.push(f);
  }

  return { pageCount: pages.length, pageSizes, fields };
}

/** Apply field values (and optionally flatten so they can't be changed). */
export async function fillForm(
  bytes: Uint8Array,
  values: Record<string, string | boolean>,
  flatten: boolean,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  for (const field of form.getFields()) {
    const name = field.getName();
    if (!(name in values)) continue;
    const v = values[name];
    try {
      if (field instanceof PDFTextField && typeof v === 'string') field.setText(v);
      else if (field instanceof PDFCheckBox) (v ? field.check() : field.uncheck());
      else if ((field instanceof PDFDropdown || field instanceof PDFOptionList) && typeof v === 'string' && v) field.select(v);
      else if (field instanceof PDFRadioGroup && typeof v === 'string' && v) field.select(v);
    } catch {
      /* skip a value the field won't accept rather than failing the whole save */
    }
  }

  if (flatten) form.flatten();
  return doc.save();
}
