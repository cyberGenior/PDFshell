# Self-hosted conversion service: LibreOffice (Office→PDF) + purpose-built
# Python libraries for PDF→Office (LibreOffice can't do that direction itself).
#
# Build needs network for apt + pip. Image is large (~1.3 GB) — that's the cost
# of bundling a full office engine for offline, private, self-hosted conversion.
FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       libreoffice-core libreoffice-writer libreoffice-calc libreoffice-impress \
       ghostscript \
       fonts-dejavu fonts-liberation \
       tesseract-ocr tesseract-ocr-eng \
       tesseract-ocr-fra tesseract-ocr-por tesseract-ocr-ara tesseract-ocr-swa tesseract-ocr-spa \
       python3 python3-pip python3-venv \
       ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Purpose-built converters: PDF→Word (pdf2docx, pulls PyMuPDF), PDF→PPTX
# (python-pptx), PDF→Excel/Text (pdfplumber + openpyxl); pytesseract+Pillow drive
# Tesseract OCR. The Document Translator runs Argos `.argosmodel` packs directly
# via ctranslate2 + sentencepiece (NO argostranslate pkg → no stanza/PyTorch),
# with fast-langdetect for source-language detection.
RUN pip3 install --no-cache-dir --break-system-packages \
      pdf2docx==0.5.8 \
      python-pptx==1.0.2 \
      pdfplumber==0.11.4 \
      openpyxl==3.1.5 \
      pytesseract==0.3.13 \
      Pillow==11.0.0 \
      ctranslate2 \
      sentencepiece \
      fast-langdetect

WORKDIR /app

# Bundle the core Argos language packs (the "language bank") into the image, and
# warm the FastText detector model — both into stable dirs so they're found at
# runtime. Override the set with --build-arg PDFSHELL_LANGS=fr,es,...
ARG PDFSHELL_LANGS=fr,pt,ar,sw,es
ENV ARGOS_PACKAGES_DIR=/opt/argos-packages \
    FTLANG_CACHE=/opt/ftlang \
    PDFSHELL_LANGS=$PDFSHELL_LANGS
COPY services/convert/install_langs.py ./install_langs.py
RUN mkdir -p "$ARGOS_PACKAGES_DIR" "$FTLANG_CACHE" \
  && python3 install_langs.py \
  && python3 -c "from fast_langdetect import detect; print(detect('warm up the model'))"

COPY services/convert/server.py ./server.py

ENV PORT=3001 HOME=/tmp
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s \
  CMD python3 -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:3001/health').status==200 else 1)"
CMD ["python3", "server.py"]
