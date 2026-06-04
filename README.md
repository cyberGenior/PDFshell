# PDFShell

Open-source, **privacy-first** PDF toolkit that runs entirely in your browser. No files are ever uploaded — all processing happens on-device via WebAssembly and WebWorkers.

Six tools: **Merge · Split · Compress · Edit · OCR · Convert.**

## Monorepo layout

```
pdfshell/
├── apps/
│   └── web/              # Next.js 15 app (App Router, static export)
├── packages/
│   ├── pdf-core/         # pdf-lib wrapper: merge, split, edit, metadata
│   ├── ocr-engine/       # Tesseract.js v6 wrapper (runs in a WebWorker)
│   └── compress-engine/  # Ghostscript-WASM wrapper + presets
├── turbo.json
└── pnpm-workspace.yaml
```

## Getting started

```bash
pnpm install        # install all workspace deps
pnpm dev            # run the web app at http://localhost:3000
pnpm test           # unit tests (Vitest) across packages
pnpm type-check     # type-check everything
pnpm build          # static export to apps/web/out
```

> Requires Node ≥ 20 and pnpm. Enable pnpm with `corepack enable` or `npm i -g pnpm`.

## Admin panel

PDFShell includes a server-side **admin** (Next.js server mode + **Postgres**) at
**`/admin`** with: site analytics (views, tool usage, devices, countries, activity
feed), **AI model cards** (set the model the whole app uses), and a **full ad
system** (banner / grid / sidebar / timed popup placements with impression &
click stats).

- **Database:** set `DATABASE_URL` to any Postgres (Render, Neon, Vercel Postgres,
  Supabase, local). Tables are created automatically on first run. No writable
  disk is needed, so it deploys cleanly to serverless/PaaS. (Local dev: `docker
  compose --profile allinone up` starts a Postgres alongside the app.)
- Default login: **`admin` / `ChangeMe!PDFShell`** — change it on first sign-in.
  Override the seed with `PDFSHELL_ADMIN_USER` / `PDFSHELL_ADMIN_PASS`.
- Set `PDFSHELL_SECRET` in production to pin the key that encrypts stored AI API
  keys (otherwise one is generated and kept in the `settings` table).
- Tracking is full (IP/country/device/browser/visitor id). File **contents** are
  never sent to the server — only usage events and the admin's own data.

## SEO

Set **`NEXT_PUBLIC_SITE_URL`** to your real domain (it's inlined at build) — it
drives canonical/Open-Graph URLs, `/robots.txt` and `/sitemap.xml`. Included:

- **Per-page titles + descriptions** for every tool (`lib/seo.ts`), a global title
  template and rich default description, Open Graph + Twitter cards.
- **`/sitemap.xml`** (landing + all tool routes) and **`/robots.txt`** (indexes the
  public site, blocks `/admin`, `/api`, `/svc`).
- **JSON-LD** `WebApplication` structured data with the full feature list.

After deploying, submit the site in **Google Search Console** and add the sitemap
(`https://your-domain/sitemap.xml`) for fastest indexing. (Backlinks are off-site —
earn them by listing PDFShell in tool directories, GitHub, and relevant communities;
code can't create them.)

## Keep the app warm (Render free tier)

Render free services **spin down after ~15 min idle** (next visitor waits ~30–60s).
Mitigations, in order of reliability:

1. **Paid plan** — Render Starter+ never spins down (the real fix).
2. **External pinger** — point [UptimeRobot](https://uptimerobot.com) or
   [cron-job.org](https://cron-job.org) at `https://your-domain/healthz` every 5 min.
3. **Bundled GitHub Action** — `.github/workflows/keep-alive.yml` pings every 10 min.
   Enable it by setting a repo **Actions variable** `KEEPALIVE_URL` to your
   `/healthz` URL (Settings → Secrets and variables → Actions → Variables).

`/healthz` is a no-DB liveness probe (also Render's health check). Note: scheduled
pings are best-effort, so an occasional cold start can still slip through — only a
paid plan removes spin-down entirely.

## Google Analytics & AdSense

Both are opt-in via env vars (nothing loads until set) and run client-side, so
they work on any host. **`NEXT_PUBLIC_*` are inlined at build time**, so set them
before building (Render passes service env vars to the Docker build as args; for
a local image use `--build-arg`).

- **Google Analytics 4:** set `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`. Loads `gtag.js`
  after interactive and sends a page_view on every route change (admin excluded).
- **AdSense:** set `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX`. This loads
  the AdSense library (Auto Ads work as configured in your AdSense dashboard) and
  serves `/ads.txt` automatically. For manual placements, drop a unit where you
  want it:

  ```tsx
  import { AdSenseUnit } from '@/components/ads/AdSense';
  <AdSenseUnit slot="1234567890" />   // slot id from your AdSense dashboard
  ```

> File **contents** still never leave the device; GA/AdSense only see standard
> web analytics/ad-serving data, and the scripts load lazily so the tools aren't
> blocked.

## Run it with Docker

**Recommended — single self-sufficient image** (web + admin + DB + LibreOffice +
Ghostscript + converter in one container; Ollama is the only optional sidecar):

```bash
docker compose --profile allinone up app    # → http://localhost:8080
```

One exposed port; the server proxies `/svc/*` to the in-container converter.
Admin/analytics state lives in the bundled **Postgres** (`pdfshell-pg` volume).
(Large, memory-hungry build — needs a
host with adequate RAM/network.)

**Split setup (lighter dev path)** — static web + separate converter:

```bash
docker compose up --build                   # web :8080  +  convert :3017
```

Host port **8080** is used (port 3000 is taken by another local project). Change
the mapping in `docker-compose.yml` if 8080 is busy.

### Office conversions (self-hosted service)

PDF↔Office (PDF→Word/Excel/PowerPoint and back) run on a self-hosted service —
the one feature where a file leaves the browser (processed on *your* server, not
a third party). Optional; all other tools work without it.

Engines used (all open-source):
- **LibreOffice** — Office→PDF (high fidelity).
- **pdf2docx** — PDF→Word (LibreOffice can't do this direction — it imports PDFs
  into Draw, which can't export Writer formats).
- **PyMuPDF + python-pptx** — PDF→PowerPoint (one page-image per slide).
- **pdfplumber + openpyxl** — PDF→Excel (table extraction).

```bash
docker compose up convert      # conversion service on http://localhost:3017
# or `docker compose up` to run web + convert together
```

> The `convert` image bundles LibreOffice + Python libs (~1.3 GB) and needs
> network to build. The web app calls it at `http://localhost:3017`; set
> `NEXT_PUBLIC_CONVERT_URL` at web build time if you change the port. When the
> service isn't running, the Office conversions show a clear "service not
> running" message and the on-device tools are unaffected.

## Roadmap

| Phase | Scope | Status |
|------|-------|--------|
| **1** | Merge & Split (pdf-lib + drag-and-drop) | ✅ implemented |
| **2** | Compress + Preview (Ghostscript WASM, PDF.js) | scaffolded |
| **3** | OCR + Convert (Tesseract.js, mammoth.js + jsPDF) | scaffolded |
| **4** | Polish + PWA (offline, dark mode, monitoring) | planned |

## Tech stack

Next.js 15 · React 19 · Tailwind CSS 4 · shadcn/ui-style components · Framer Motion ·
Zustand · React Dropzone · pdf-lib · PDF.js · Ghostscript-WASM · Tesseract.js v6 ·
TypeScript · Vitest · Playwright · Turborepo · pnpm.

## License

MIT
