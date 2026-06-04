// Verifies the comprehensive PDF→XLSX (multi-sheet, reconstructed columns,
// numeric cells) and PDF→PPTX (editable landscape text slides). Against the
// running conversion service.  node e2e/deep-xlsx-pptx.mjs
import { inflateRawSync } from 'node:zlib';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const svc = process.env.CONVERT ?? 'http://localhost:3017';

function listZip(buf) {
  const names = [];
  let i = 0;
  while (i + 4 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    names.push(buf.toString('utf8', i + 30, i + 30 + nameLen));
    i = i + 30 + nameLen + extraLen + compSize;
  }
  return names;
}
function readZip(buf, name) {
  let i = 0;
  while (i + 4 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const fname = buf.toString('utf8', i + 30, i + 30 + nameLen);
    const start = i + 30 + nameLen + extraLen;
    const data = buf.subarray(start, start + compSize);
    if (fname === name) return method === 8 ? inflateRawSync(data) : Buffer.from(data);
    i = start + compSize;
  }
  return null;
}
async function post(target, body) {
  const r = await fetch(`${svc}/convert?target=${target}`, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream', 'x-source-ext': 'pdf' },
    body,
  });
  if (!r.ok) throw new Error(`${target} → ${r.status} ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

/** A 2-page PDF with column-positioned rows (Item / Qty / Price). */
async function tablePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = [
    [['Item', 'Qty', 'Price'], ['Cement', '10', '120.50'], ['Steel', '5', '300']],
    [['Item', 'Qty', 'Price'], ['Timber', '8', '75.25'], ['Paint', '3', '210']],
  ];
  for (const rows of pages) {
    const page = doc.addPage([520, 600]);
    rows.forEach((row, ri) => {
      const y = 540 - ri * 30;
      page.drawText(row[0], { x: 50, y, size: 13, font });
      page.drawText(row[1], { x: 250, y, size: 13, font });
      page.drawText(row[2], { x: 380, y, size: 13, font });
    });
  }
  return Buffer.from(await doc.save());
}

const pdf = await tablePdf();

// ---- XLSX ----
const xlsx = await post('xlsx', pdf);
const sheetNames = listZip(xlsx).filter((n) => /xl\/worksheets\/sheet\d+\.xml/.test(n));
const wbXml = readZip(xlsx, 'xl/workbook.xml').toString('utf8');
// openpyxl writes inline strings, so cell text lives in the sheet XMLs.
const sheetsXml = sheetNames.map((n) => readZip(xlsx, n).toString('utf8')).join('\n');

if (sheetNames.length < 2) throw new Error(`expected ≥2 sheets, got ${sheetNames.length}`);
if (!/name="Page 1"/.test(wbXml) || !/name="Page 2"/.test(wbXml)) throw new Error('missing per-page sheet names');
for (const w of ['Item', 'Cement', 'Steel', 'Timber']) if (!sheetsXml.includes(w)) throw new Error(`xlsx missing "${w}"`);
if (!/ r="C\d/.test(sheetsXml)) throw new Error('xlsx has no column C — layout not reconstructed into columns');
if (!/<v>120\.5<\/v>/.test(sheetsXml)) throw new Error('xlsx did not store 120.50 as a number');
console.log(`PDF→XLSX: ${sheetNames.length} sheets, columns reconstructed (A1:C…), "120.50" stored as number ✓`);

// ---- PPTX ----
const pptx = await post('pptx', pdf);
const slideFiles = listZip(pptx).filter((n) => /ppt\/slides\/slide\d+\.xml/.test(n));
const pres = readZip(pptx, 'ppt/presentation.xml').toString('utf8');
const m = pres.match(/sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
const [cx, cy] = [Number(m[1]), Number(m[2])];
const slide1 = readZip(pptx, 'ppt/slides/slide1.xml').toString('utf8');

if (slideFiles.length !== 2) throw new Error(`expected 2 slides, got ${slideFiles.length}`);
if (cx <= cy) throw new Error(`pptx not landscape: ${cx}×${cy}`);
if (!/<a:t>/.test(slide1)) throw new Error('slide has no editable text runs (image-only)');
if (!/Item|Cement|Qty/.test(slide1)) throw new Error('slide text does not contain page content');
console.log(`PDF→PPTX: ${slideFiles.length} landscape slides with EDITABLE text (<a:t> runs) ✓`);

console.log('DEEP XLSX + PPTX VERIFIED');
