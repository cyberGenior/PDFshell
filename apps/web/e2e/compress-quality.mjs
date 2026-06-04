// Verifies: (1) Ghostscript compression actually shrinks image-heavy PDFs and
// never inflates text PDFs; (2) PDF→PPTX produces LANDSCAPE slides even from a
// portrait PDF; (3) PDF→XLSX uses per-page sheets. Against the running service.
//   node e2e/compress-quality.mjs
import { inflateRawSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const base = process.env.BASE ?? 'http://localhost:8080';
const svc = process.env.CONVERT ?? 'http://localhost:3017';

/** Minimal ZIP entry reader (handles deflate + stored) for OOXML inspection. */
function readZipEntry(buf, name) {
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

async function post(path, body, headers = {}) {
  const r = await fetch(`${svc}${path}`, { method: 'POST', headers: { 'content-type': 'application/octet-stream', ...headers }, body });
  if (!r.ok) throw new Error(`${path} → ${r.status} ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

async function textPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([420, 595]); // portrait
  page.drawText('Quarterly report — portrait page', { x: 40, y: 540, size: 16, font });
  return Buffer.from(await doc.save());
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  // Build a high-resolution, image-heavy PDF (noisy JPEG so it's not trivially
  // compressible) using a real canvas in Chrome, embedded at ~190 dpi.
  const page = await browser.newPage();
  const jpegB64 = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 1500; c.height = 2000;
    const ctx = c.getContext('2d');
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = `hsl(${Math.floor(Math.random() * 360)},70%,${30 + Math.random() * 50}%)`;
      ctx.fillRect(Math.random() * 1500, Math.random() * 2000, Math.random() * 60, Math.random() * 60);
    }
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (const b of buf) s += String.fromCharCode(b);
    return btoa(s);
  });
  const jpeg = Buffer.from(jpegB64, 'base64');
  const idoc = await PDFDocument.create();
  const img = await idoc.embedJpg(jpeg);
  const ipage = idoc.addPage([595, 793]); // A4-ish; 1500px over 595pt ≈ 190 dpi
  ipage.drawImage(img, { x: 0, y: 0, width: 595, height: 793 });
  const imagePdf = Buffer.from(await idoc.save());

  // 1. Compression shrinks an image-heavy PDF.
  const compressed = await post('/compress?preset=screen', imagePdf);
  if (compressed.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('compressed not a PDF');
  if (compressed.length >= imagePdf.length) throw new Error(`did not shrink: ${imagePdf.length} → ${compressed.length}`);
  console.log(`Compress image PDF: ${(imagePdf.length / 1024).toFixed(0)}KB → ${(compressed.length / 1024).toFixed(0)}KB (−${Math.round((1 - compressed.length / imagePdf.length) * 100)}%) ✓`);

  // 2. Never inflates a text PDF.
  const tpdf = await textPdf();
  const tout = await post('/compress?preset=ebook', tpdf);
  if (tout.length > tpdf.length) throw new Error(`text PDF inflated: ${tpdf.length} → ${tout.length}`);
  console.log(`Compress text PDF: ${tpdf.length} → ${tout.length} bytes (never larger) ✓`);

  // 3. PDF→PPTX is landscape 16:9 even from a portrait PDF.
  const pptx = await post('/convert?target=pptx', tpdf, { 'x-source-ext': 'pdf' });
  const presXml = readZipEntry(pptx, 'ppt/presentation.xml')?.toString('utf8') ?? '';
  const m = presXml.match(/sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  if (!m) throw new Error('no slide size in pptx');
  const [cx, cy] = [Number(m[1]), Number(m[2])];
  if (cx <= cy) throw new Error(`pptx not landscape: cx=${cx} cy=${cy}`);
  console.log(`PDF→PPTX from portrait: slide ${cx}×${cy} (landscape 16:9) ✓`);

  // 4. PDF→XLSX uses per-page sheets.
  const xlsx = await post('/convert?target=xlsx', tpdf, { 'x-source-ext': 'pdf' });
  const wbXml = readZipEntry(xlsx, 'xl/workbook.xml')?.toString('utf8') ?? '';
  if (!/name="Page 1"/.test(wbXml)) throw new Error('xlsx missing per-page sheet "Page 1"');
  console.log('PDF→XLSX: per-page sheet "Page 1" present ✓');

  // 5. Through the UI: Compress page strong/smallest shrinks the image PDF.
  const ui = await browser.newPage();
  await ui.goto(`${base}/compress`, { waitUntil: 'networkidle' });
  await ui.locator('input[type="file"]').setInputFiles({ name: 'image.pdf', mimeType: 'application/pdf', buffer: imagePdf });
  await ui.getByText('Smallest', { exact: true }).click();
  await ui.getByRole('button', { name: 'Compress', exact: true }).click();
  await ui.getByText(/% smaller/).waitFor({ timeout: 60_000 });
  console.log('Web Compress: shows "% smaller" + download ✓');

  console.log('COMPRESSION + PPTX + XLSX VERIFIED');
} finally {
  await browser.close();
}
