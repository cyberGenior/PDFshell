# Fast, reliable local-serve image over the pre-built static export.
#
# Uses python:3.12-slim (already cached locally) instead of nginx because the
# nginx base image can't be pulled in this offline environment. For the
# production nginx image, use Dockerfile.fullbuild once the registry is
# reachable.
#
# Build the export first, then run:
#     pnpm --filter @pdfshell/web build
#     docker compose up --build      →   http://localhost:8080
FROM python:3.12-slim
WORKDIR /site
COPY apps/web/out /site
COPY docker/serve.py /serve.py
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost/').status==200 else 1)" || exit 1
CMD ["python", "/serve.py"]
