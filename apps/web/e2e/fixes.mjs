// E2E for two fixes against the running container (system Chrome):
//   1. DOCX → PDF produces a non-blank PDF with REAL selectable text.
//   2. Split lets you click page thumbnails to select, then extract.
//   node e2e/fixes.mjs
import { deflateRawSync, crc32 } from 'node:zlib';
import { chromium } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const base = process.env.BASE ?? 'http://localhost:8080';

// ---- Minimal .docx (store/deflate ZIP of OOXML) so we don't need a fixture file.
function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const comp = deflateRawSync(data);
    const crc = crc32(data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    chunks.push(local, nameBuf, comp);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(comp.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);
    offset += local.length + nameBuf.length + comp.length;
  }
  const cdStart = offset;
  let cdLen = 0;
  for (const c of central) cdLen += c.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdLen, 12);
  eocd.writeUInt32LE(cdStart, 16);
  return Buffer.concat([...chunks, ...central, eocd]);
}

function makeDocx() {
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const para = (t) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
  const body =
    para('Zambia Re Enterprise Risk Survey') +
    Array.from({ length: 8 }, (_, i) => para(`Finding number ${i + 1}: risk management observation text.`)).join('');
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`;
  return zip([
    { name: '[Content_Types].xml', data: Buffer.from(ct) },
    { name: '_rels/.rels', data: Buffer.from(rels) },
    { name: 'word/document.xml', data: Buffer.from(docXml) },
  ]);
}

async function makePdf(pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([400, 560]);
    page.drawText(`Page ${p + 1}`, { x: 40, y: 500, size: 24, font });
  }
  return Buffer.from(await doc.save());
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  // ---- 1. DOCX → PDF: capture the download, assert it has real text (not blank).
  const p1 = await browser.newPage();
  await p1.goto(`${base}/convert`, { waitUntil: 'networkidle' });
  await p1.locator('input[type="file"]').setInputFiles({
    name: 'survey.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: makeDocx(),
  });
  const [dl] = await Promise.all([
    p1.waitForEvent('download'),
    p1.getByRole('button', { name: /Convert to PDF/ }).click(),
  ]);
  const path = await dl.path();
  const { readFileSync } = await import('node:fs');
  const bytes = new Uint8Array(readFileSync(path));
  const out = await PDFDocument.load(bytes);
  // jsPDF writes uncompressed text by default: look for text-show operators and
  // the actual words from the DOCX in the content stream.
  const raw = Buffer.from(bytes).toString('latin1');
  const hasTextOps = raw.includes('Tj') || raw.includes('TJ');
  const hasWords = raw.includes('Finding number') || raw.includes('Zambia Re');
  if (out.getPageCount() < 1) throw new Error('DOCX→PDF produced no pages');
  if (!hasTextOps) throw new Error('DOCX→PDF appears blank (no text operators)');
  if (!hasWords) throw new Error('DOCX→PDF is missing the document text');
  console.log(`DOCX→PDF OK — ${out.getPageCount()} page(s), selectable text present, ${bytes.length} bytes`);

  // ---- 2. Split: click thumbnails to select, then extract.
  const p2 = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await p2.goto(`${base}/split`, { waitUntil: 'networkidle' });
  await p2.locator('input[type="file"]').setInputFiles({
    name: 'doc.pdf', mimeType: 'application/pdf', buffer: await makePdf(6),
  });
  await p2.locator('button[aria-pressed]').first().waitFor({ timeout: 30_000 });
  // Select pages 1 and 3 by clicking their thumbnails.
  await p2.locator('button[aria-pressed]').nth(0).click();
  await p2.locator('button[aria-pressed]').nth(2).click();
  await p2.screenshot({ path: 'e2e/shot-split-select.png' });
  const [dl2] = await Promise.all([
    p2.waitForEvent('download'),
    p2.getByRole('button', { name: /Extract 2 pages/ }).click(),
  ]);
  const ep = await dl2.path();
  const ex = await PDFDocument.load(new Uint8Array(readFileSync(ep)));
  if (ex.getPageCount() !== 2) throw new Error(`expected 2 extracted pages, got ${ex.getPageCount()}`);
  console.log('SPLIT-SELECT OK — clicked 2 thumbnails, extracted a 2-page PDF');

  console.log('ALL FIXES VERIFIED');
} finally {
  await browser.close();
}
