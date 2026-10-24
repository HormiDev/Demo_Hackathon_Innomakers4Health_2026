FROM node:22-alpine AS frontend-deps
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM frontend-deps AS frontend-tests
COPY frontend/ ./
CMD ["npm", "test"]

FROM frontend-tests AS frontend-build
RUN npm run build

FROM python:3.12-slim AS backend-base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY scripts/prepare_tokenizer.py ./scripts/prepare_tokenizer.py
RUN python scripts/prepare_tokenizer.py
COPY backend/ ./backend/

FROM backend-base AS backend-tests
COPY backend/requirements-dev.txt ./backend/requirements-dev.txt
RUN pip install --no-cache-dir -r backend/requirements-dev.txt
COPY tests/ ./tests/
COPY examples/ ./examples/
COPY scripts/live_check.py ./scripts/live_check.py
COPY scripts/quality_check.py ./scripts/quality_check.py
CMD ["python", "-m", "pytest", "-q", "tests"]

FROM backend-base AS runtime
COPY --from=frontend-build /web/dist ./frontend/dist
COPY scripts/live_check.py ./scripts/live_check.py
COPY scripts/quality_check.py ./scripts/quality_check.py
COPY examples/ ./examples/
RUN useradd --uid 10001 --no-create-home appuser
USER appuser
ENV APP_PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=135s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.getenv('APP_PORT','8080')+'/api/catalog',timeout=3)"
CMD ["sh", "-c", "exec uvicorn backend.app:app --host 0.0.0.0 --port ${APP_PORT:-8080} --no-access-log"]
