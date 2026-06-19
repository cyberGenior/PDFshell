"""Download the core Argos `.argosmodel` language packs at image-build time — the
bundled 'language bank' — WITHOUT installing the `argostranslate` package (which
would drag in stanza→PyTorch). We fetch the public Argos package index, download
each pack (a zip), and extract it into ARGOS_PACKAGES_DIR. At runtime server.py
loads these dirs directly via CTranslate2 + SentencePiece.

Argos pivots through English, so each language is installed paired with English
(X↔en). Configure the set with PDFSHELL_LANGS (comma ISO codes). Default:
African-market-first common languages."""
import json
import os
import sys
import tempfile
import urllib.request
import zipfile

INDEX_URL = os.environ.get(
    "ARGOS_INDEX_URL",
    "https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json",
)
DEST = os.environ.get("ARGOS_PACKAGES_DIR", "/opt/argos-packages")
CORE = [c.strip() for c in os.environ.get("PDFSHELL_LANGS", "fr,pt,ar,sw,es").split(",") if c.strip()]

# A browser-ish User-Agent — argos-net.com 403s the default Python urllib UA.
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) PDFShell/1.0"}


def _open(url, timeout):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout)


os.makedirs(DEST, exist_ok=True)
print(f"[langs] fetching index {INDEX_URL}", flush=True)
with _open(INDEX_URL, 60) as r:
    index = json.loads(r.read())


def find_link(frm, to):
    for entry in index:
        if entry.get("from_code") == frm and entry.get("to_code") == to:
            links = entry.get("links") or []
            return links[0] if links else None
    return None


pairs = []
for code in CORE:
    pairs += [("en", code), (code, "en")]

ok = 0
for frm, to in pairs:
    url = find_link(frm, to)
    if not url:
        print(f"[langs] no pack for {frm}->{to}; skipping", flush=True)
        continue
    try:
        print(f"[langs] downloading {frm}->{to} …", flush=True)
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
            with _open(url, 600) as resp:
                tmp.write(resp.read())
            path = tmp.name
        out_dir = os.path.join(DEST, f"{frm}_{to}")
        with zipfile.ZipFile(path) as z:
            z.extractall(out_dir)
        os.remove(path)
        ok += 1
    except Exception as exc:  # noqa: BLE001
        print(f"[langs] FAILED {frm}->{to}: {exc}", flush=True)

print(f"[langs] done ({ok}/{len(pairs)} packs)", flush=True)
sys.exit(0)
