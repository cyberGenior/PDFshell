# PDFShell — canonical deploy image (build-from-source, single self-sufficient
# container). This is what Render and any "deploy this repo" platform picks up by
# default. Contains everything except the optional Ollama AI sidecar:
#   • Next.js server (public tools + admin + analytics + ads + SQLite)
#   • Python conversion service (LibreOffice, Ghostscript, PyMuPDF, Tesseract,
#     pdf2docx/python-pptx/pdfplumber/openpyxl)
# One exposed port; the Next server proxies /svc/* to the in-container converter.
#
#   Local:  docker build -t pdfshell . && docker run -p 8080:3000 pdfshell
#   Render: uses this file automatically (see render.yaml).
#
# NOTE: large image (~2 GB) and a memory-hungry build — give it adequate RAM.
# For a faster LOCAL rebuild that reuses a host-built Next bundle, see
# Dockerfile.allinone (used by `docker compose --profile allinone`).

# ---------- builder: compile the Next standalone server from source ----------
FROM node:22-bookworm AS builder
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/pdf-core/package.json packages/pdf-core/package.json
COPY packages/ocr-engine/package.json packages/ocr-engine/package.json
COPY packages/compress-engine/package.json packages/compress-engine/package.json
RUN pnpm install --frozen-lockfile
COPY . .
# No NEXT_PUBLIC_CONVERT_URL → the client uses the same-origin /svc proxy.
RUN pnpm --filter @pdfshell/web build

# ---------- runtime: Node + LibreOffice + Ghostscript + Python + Tesseract ----
FROM node:22-bookworm AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       libreoffice-core libreoffice-writer libreoffice-calc libreoffice-impress \
       ghostscript fonts-dejavu fonts-liberation \
       tesseract-ocr tesseract-ocr-eng \
       python3 python3-pip ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# pdf2docx pulls PyMuPDF (fitz) used by Edit + PDF→Excel; pytesseract+Pillow drive
# Tesseract for editing scanned PDFs.
RUN pip3 install --no-cache-dir --break-system-packages \
       pdf2docx==0.5.8 python-pptx==1.0.2 pdfplumber==0.11.4 openpyxl==3.1.5 \
       pytesseract==0.3.13 Pillow==11.0.0

WORKDIR /app
# Next standalone output (monorepo layout: server at apps/web/server.js).
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public
# Conversion service + launcher.
COPY --from=builder /repo/services/convert/server.py ./convert/server.py
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

ENV NODE_ENV=production \
    PORT=3000 HOSTNAME=0.0.0.0 \
    PDFSHELL_DB_PATH=/app/data/pdfshell.db \
    PDFSHELL_TMP=/app/tmp \
    APP_URL=http://127.0.0.1:3000 \
    INTERNAL_CONVERT_URL=http://127.0.0.1:3001 \
    OLLAMA_URL=http://host.docker.internal:11434 \
    OLLAMA_MODEL=llama3.2:3b \
    OLLAMA_NUM_GPU=0

# Render/most PaaS inject $PORT; the launcher binds Next to it (converter stays
# on :3001 internally). EXPOSE is documentation only.
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=4s \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
CMD ["/start.sh"]
