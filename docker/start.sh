#!/bin/sh
# Launch the conversion service (background) and the Next server (foreground).
set -e
mkdir -p /app/data /app/tmp

echo "[pdfshell] starting conversion service on :3001"
PORT=3001 python3 /app/convert/server.py &
CONVERT_PID=$!

# If the converter dies, take the container down so the orchestrator restarts it.
trap 'kill "$CONVERT_PID" 2>/dev/null || true' TERM INT

echo "[pdfshell] starting web server on :$PORT"
exec node apps/web/server.js
