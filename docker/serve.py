"""Minimal static file server for PDFShell's Next.js export.

Used by the default Docker image because the nginx base image could not be
pulled in this offline environment, whereas python:3.12-slim was already
available locally. It mirrors the important bits of docker/nginx.conf:
  * clean URLs   — /merge resolves to /merge.html
  * correct MIME — .wasm is served as application/wasm (needed for streaming
    compile of the PDF/OCR engines)
"""

import http.server
import mimetypes
import os
import socketserver

ROOT = "/site"
PORT = 80

mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("text/javascript", ".mjs")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        # Clean-URL resolution for Next.js static export. A route like /convert
        # exists both as convert.html AND a convert/ directory (its sub-pages),
        # so we must prefer the sibling .html over the directory; and /foo with
        # no file falls back to /foo.html.
        path = self.translate_path(self.path)
        clean = self.path.split("?", 1)[0]
        if os.path.isdir(path):
            if not os.path.isfile(os.path.join(path, "index.html")) and os.path.isfile(
                path.rstrip("/\\") + ".html"
            ):
                self.path = clean.rstrip("/") + ".html"
        elif not os.path.isfile(path) and os.path.isfile(path + ".html"):
            self.path = clean + ".html"
        return super().send_head()

    def end_headers(self):
        # Immutable hashed assets cache hard; everything else stays fresh.
        if "/_next/static/" in self.path or self.path.endswith((".wasm", ".woff2")):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"PDFShell serving {ROOT} on :{PORT}", flush=True)
        httpd.serve_forever()
