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
       fonts-crosextra-carlito fonts-crosextra-caladea fonts-noto-core \
       tesseract-ocr tesseract-ocr-eng \
       python3 python3-pip python3-venv \
       ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Purpose-built converters: PDF→Word (pdf2docx, pulls PyMuPDF), PDF→PPTX
# (python-pptx), PDF→Excel/Text (pdfplumber + openpyxl). pytesseract+Pillow drive
# Tesseract for OCR-ing scanned PDFs before PDF→Word.
RUN pip3 install --no-cache-dir --break-system-packages \
      pdf2docx==0.5.8 \
      python-pptx==1.0.2 \
      pdfplumber==0.11.4 \
      openpyxl==3.1.5 \
      pytesseract==0.3.13 \
      Pillow==11.0.0

WORKDIR /app
COPY services/convert/server.py ./server.py

ENV PORT=3001 HOME=/tmp
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s \
  CMD python3 -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:3001/health').status==200 else 1)"
CMD ["python3", "server.py"]
