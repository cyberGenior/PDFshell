// End-to-end test of the opt-in local-AI PDF→PowerPoint enhancement (Ollama).
//   node e2e/ai-pptx.mjs
import { inflateRawSync } from 'node:zlib';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const svc = process.env.CONVERT ?? 'http://localhost:3017';

function listZip(buf) {
  const names = [];
  let i = 0;
  while (i + 4 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const cs = buf.readUInt32LE(i + 18), nl = buf.readUInt16LE(i + 26), el = buf.readUInt16LE(i + 28);
    names.push(buf.toString('utf8', i + 30, i + 30 + nl));
    i = i + 30 + nl + el + cs;
  }
  return names;
}
function readZip(buf, name) {
  let i = 0;
  while (i + 4 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const m = buf.readUInt16LE(i + 8), cs = buf.readUInt32LE(i + 18), nl = buf.readUInt16LE(i + 26), el = buf.readUInt16LE(i + 28);
    const fn = buf.toString('utf8', i + 30, i + 30 + nl);
    const st = i + 30 + nl + el;
    const d = buf.subarray(st, st + cs);
    if (fn === name) return m === 8 ? inflateRawSync(d) : Buffer.from(d);
    i = st + cs;
  }
  return null;
}

async function makeReportPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const paras = [
    'Quarterly Business Review — Q2 2025',
    'Revenue grew 18 percent quarter over quarter, driven by strong mobile-money adoption across Zambia and Kenya. Active merchants increased from 12,000 to 15,400.',
    'Operating costs fell as cloud spend was optimised. Support ticket volume dropped 22 percent after the new self-service help centre launched.',
    'Risks: load-shedding affected uptime in March; we are adding offline-first queueing. Card fraud attempts rose but were blocked by the new rules engine.',
    'Next quarter we will expand to Tanzania, launch USSD onboarding, and ship the merchant analytics dashboard.',
  ];
  const page = doc.addPage([595, 842]);
  let y = 790;
  for (const p of paras) {
    const words = p.split(' ');
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).length > 80) { page.drawText(line, { x: 40, y, size: 11, font }); y -= 16; line = w; }
      else line = line ? line + ' ' + w : w;
    }
    page.drawText(line, { x: 40, y, size: 11, font }); y -= 26;
  }
  return Buffer.from(await doc.save());
}

const pdf = await makeReportPdf();

const MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';

// 1. Direct: confirm the model returns structured JSON (any list-shaped result).
console.log(`Asking the local model (${MODEL}) for a slide outline…`);
const gen = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    model: MODEL,
    prompt: 'Return ONLY JSON {"slides":[{"title":"string","bullets":["string"]}]} summarizing: Revenue grew 18% in Q2; costs fell; expanding to Tanzania.',
    stream: false,
    format: 'json',
    options: { temperature: 0.2, num_ctx: 4096, num_gpu: 0 },
  }),
}).then((r) => r.json());
if (gen.error) throw new Error(`model error: ${gen.error}`);
const parsed = JSON.parse(gen.response || '{}');
const anyList = Array.isArray(parsed) ? parsed : Object.values(parsed).find((v) => Array.isArray(v));
if (!anyList || anyList.length === 0) throw new Error('model did not return a list of slides');
console.log(`Model returned ${anyList.length} structured item(s) ✓`);

// 2. Service ai=1 → AI-authored pptx.
console.log('Converting PDF→PPTX with AI enhancement…');
const r = await fetch(`${svc}/convert?target=pptx&ai=1`, {
  method: 'POST',
  headers: { 'content-type': 'application/octet-stream', 'x-source-ext': 'pdf' },
  body: pdf,
});
if (!r.ok) throw new Error(`ai pptx failed: ${r.status} ${await r.text()}`);
const pptx = Buffer.from(await r.arrayBuffer());

const slides = listZip(pptx).filter((n) => /ppt\/slides\/slide\d+\.xml/.test(n));
const pres = readZip(pptx, 'ppt/presentation.xml').toString('utf8');
const m = pres.match(/sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
const slide1 = readZip(pptx, 'ppt/slides/slide1.xml').toString('utf8');
const texts = [...slide1.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((x) => x[1]).join(' | ');

if (slides.length < 1) throw new Error('no slides produced');
if (Number(m[1]) <= Number(m[2])) throw new Error('not landscape');
if (!/<a:t>/.test(slide1)) throw new Error('slides are not editable text');

// Prove AI actually ran (not a silent deterministic fallback): the deterministic
// path copies the PDF's raw wrapped lines; AI rephrases concisely. The two
// outputs must differ.
console.log('Converting the same PDF WITHOUT AI for comparison…');
const r0 = await fetch(`${svc}/convert?target=pptx`, {
  method: 'POST',
  headers: { 'content-type': 'application/octet-stream', 'x-source-ext': 'pdf' },
  body: pdf,
});
const pptx0 = Buffer.from(await r0.arrayBuffer());
const det1 = readZip(pptx0, 'ppt/slides/slide1.xml').toString('utf8');
const detTexts = [...det1.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((x) => x[1]).join(' | ');

if (texts.trim() === detTexts.trim()) {
  throw new Error('AI output identical to deterministic — AI likely fell back (not actually used)');
}
console.log(`AI PPTX: ${slides.length} landscape editable slides, content AI-rephrased ✓`);
console.log(`  AI slide 1:  ${texts.slice(0, 110)}…`);
console.log(`  Non-AI s1:   ${detTexts.slice(0, 110)}…`);
console.log('AI ENHANCE (Ollama) VERIFIED');
