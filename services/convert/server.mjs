/**
 * PDFShell conversion service — self-hosted LibreOffice, dependency-free.
 *
 * Contract (called by apps/web/lib/libreoffice.ts):
 *   GET  /health                     → 200 "ok"
 *   POST /convert?target=<ext>       → converted file bytes
 *        headers: content-type: application/octet-stream
 *                 x-source-ext: pdf | docx | xlsx | pptx | ...
 *        body:    raw source file bytes
 *
 * It runs `soffice --headless --convert-to <target>` in an isolated temp dir.
 * The file is processed here on the server, NOT in the user's browser — that's
 * the trade-off for true PDF↔Office fidelity (documented in the UI).
 */
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.PORT ?? 3001);
const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
};

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'content-type, x-source-ext',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function runSoffice(args) {
  return new Promise((resolve, reject) => {
    execFile('soffice', args, { timeout: 120_000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }
  if (req.method === 'GET' && req.url?.startsWith('/health')) {
    res.writeHead(200, { ...cors, 'content-type': 'text/plain' });
    return res.end('ok');
  }
  if (req.method !== 'POST' || !req.url?.startsWith('/convert')) {
    res.writeHead(404, cors);
    return res.end('Not found');
  }

  const url = new URL(req.url, 'http://localhost');
  const target = (url.searchParams.get('target') ?? '').toLowerCase();
  const sourceExt = (req.headers['x-source-ext'] ?? 'pdf').toString().toLowerCase();
  if (!/^[a-z0-9]{1,5}$/.test(target)) {
    res.writeHead(400, cors);
    return res.end('Invalid target');
  }

  let dir;
  try {
    const body = await readBody(req);
    if (body.length === 0) {
      res.writeHead(400, cors);
      return res.end('Empty body');
    }
    dir = await mkdtemp(join(tmpdir(), 'pdfshell-'));
    const inPath = join(dir, `in.${sourceExt}`);
    await writeFile(inPath, body);

    await runSoffice([
      '--headless',
      '--norestore',
      `-env:UserInstallation=file://${join(dir, 'profile')}`,
      '--convert-to',
      target,
      '--outdir',
      dir,
      inPath,
    ]);

    const produced = (await readdir(dir)).find((f) => f === `in.${target}`);
    if (!produced) throw new Error(`LibreOffice produced no ${target} output`);
    const out = await readFile(join(dir, produced));

    res.writeHead(200, {
      ...cors,
      'content-type': MIME[target] ?? 'application/octet-stream',
      'content-length': out.length,
    });
    res.end(out);
  } catch (err) {
    res.writeHead(500, { ...cors, 'content-type': 'text/plain' });
    res.end(`Conversion failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    if (dir) rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

server.listen(PORT, () => console.log(`PDFShell convert service on :${PORT}`));
