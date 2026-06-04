# Decision: Compress with pdf-lib (MIT), not Ghostscript-WASM (AGPL)

Status: accepted · 2026-06-02

## Context / constraint

The architecture spec specifies **Compress** via *Ghostscript compiled to WebAssembly*
with `/screen /ebook /printer /prepress` presets. PDFShell is positioned as an
**MIT, fork-friendly open-source** project, and targets African users on
**metered, expensive mobile data and low-end Android** devices.

## Source of truth

- `PDFShell_Architecture_Spec.pdf` — Phase 2 "Compress + Preview", Ghostscript-WASM.
- web-dev-partner skill §1 (docs = truth, surface conflicts), §6 (African market),
  §7 (know what works).

## Spike findings (verified)

`@jspawn/ghostscript-wasm@0.0.2` was prototyped in Node via an `instantiateWasm`
override (the same path that works in a WebWorker):

- ✅ Runs end to end: exit 0, valid `%PDF-1.4` output.
- ✅ Compression: −30.9% on a text-only PDF (worst case); more on image-heavy.
- ⚠️ **Binary size: 15.8 MB** `.wasm` — a real one-time cost on metered data.
- ⛔ **License: AGPL-3.0.** Ghostscript is AGPL/commercial dual-licensed.
  Serving it over a network makes the *entire app* AGPL — incompatible with the
  MIT, fork-friendly promise.

## Options considered

- **Ghostscript-WASM (AGPL)** — strongest compression, matches spec; but forces
  AGPL relicensing of all of PDFShell and a 15.8 MB download per user.
- **pdf-lib re-save + optional image flatten (MIT)** — license-clean, no large
  download (reuses pdf-lib already in `pdf-core`); weaker than Ghostscript on
  text PDFs, but strong on image/scanned PDFs via DPI-capped rasterise.
- **Defer Compress** — ship the other tools, decide later.

## Chosen

**pdf-lib approach, PDFShell stays MIT** (user decision).

Two modes:
1. **Lossless re-save** (default, safe): re-serialise with object streams and drop
   redundant objects. Modest gains; never degrades quality; keeps selectable text.
2. **Aggressive / flatten** (opt-in): render pages via PDF.js to a capped DPI
   (screen 72 / ebook 150 / print 300) and rebuild as JPEG-backed pages. Big gains
   on scanned/image PDFs; **loses selectable text** — clearly labelled in the UI.

## Trade-offs accepted

- Weaker text-PDF compression than Ghostscript's `/ebook`.
- Aggressive mode is lossy and de-textifies pages (explicit user choice only).

## Risks / unknowns

- pdf-lib has no native image *recompression*; the flatten path raster-renders,
  which is the honest MIT way to get real size cuts on image-heavy files.
- Revisit if a permissively-licensed (MIT/BSD/Apache) PDF optimiser matures.
