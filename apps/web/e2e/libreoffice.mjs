// Verifies the self-hosted conversion service end to end — the raw endpoints for
// every target, plus the PDF→Word page in the running web app (system Chrome).
//   node e2e/libreoffice.mjs
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const base = process.env.BASE ?? 'http://localhost:8080';
const svc = process.env.CONVERT ?? 'http://localhost:3017';

async function makePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([420, 560]);
  page.drawText('Conversion round-trip test document', { x: 40, y: 500, size: 16, font });
  page.drawText('Second line of content for extraction.', { x: 40, y: 470, size: 12, font });
  return Buffer.from(await doc.save());
}

async function convert(body, target, sourceExt) {
  const r = await fetch(`${svc}/convert?target=${target}`, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream', 'x-source-ext': sourceExt },
    body,
  });
  if (!r.ok) throw new Error(`${sourceExt}→${target} failed: ${r.status} ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

const has = (buf, part) => buf.subarray(0, 2).toString('latin1') === 'PK' && buf.toString('latin1').includes(part);
const isPdf = (buf) => buf.subarray(0, 5).toString('latin1') === '%PDF-';

const pdf = await makePdf();
const out = [];

// 1. Health
const health = await fetch(`${svc}/health`).then((r) => r.text()).catch(() => 'DOWN');
if (health.trim() !== 'ok') throw new Error(`service health = ${health}`);
out.push('Service /health: ok ✓');

// 2. PDF → DOCX (pdf2docx)
const docx = await convert(pdf, 'docx', 'pdf');
if (!has(docx, 'word/document.xml')) throw new Error('PDF→DOCX not a valid .docx');
out.push(`PDF→Word: valid .docx (${docx.length} bytes) ✓`);

// 3. DOCX → PDF round-trip (LibreOffice)
const backToPdf = await convert(docx, 'pdf', 'docx');
if (!isPdf(backToPdf)) throw new Error('DOCX→PDF not a valid PDF');
out.push(`Word→PDF (round-trip): valid PDF (${backToPdf.length} bytes) ✓`);

// 4. PDF → PPTX (PyMuPDF + python-pptx)
const pptx = await convert(pdf, 'pptx', 'pdf');
if (!has(pptx, 'ppt/presentation.xml')) throw new Error('PDF→PPTX not a valid .pptx');
out.push(`PDF→PowerPoint: valid .pptx (${pptx.length} bytes) ✓`);

// 5. PDF → XLSX (pdfplumber + openpyxl)
const xlsx = await convert(pdf, 'xlsx', 'pdf');
if (!has(xlsx, 'xl/workbook.xml')) throw new Error('PDF→XLSX not a valid .xlsx');
out.push(`PDF→Excel: valid .xlsx (${xlsx.length} bytes) ✓`);

// 6. Through the web UI (PDF → Word page)
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  await page.goto(`${base}/convert/pdf-to-word`, { waitUntil: 'networkidle' });
  await page.locator('input[type="file"]').setInputFiles({ name: 'doc.pdf', mimeType: 'application/pdf', buffer: pdf });
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 90_000 }),
    page.getByRole('button', { name: /Convert to DOCX/ }).click(),
  ]);
  const uiDocx = readFileSync(await dl.path());
  if (!dl.suggestedFilename().endsWith('.docx') || !has(uiDocx, 'word/document.xml')) {
    throw new Error('UI did not download a valid .docx');
  }
  out.push(`Web PDF→Word: downloaded valid ${dl.suggestedFilename()} ✓`);
} finally {
  await browser.close();
}

console.log(out.join('\n'));
console.log('CONVERSION SERVICE VERIFIED');
