# syntax=docker/dockerfile:1.7
# Multi-stage build for the Kinetic backend.
# Build context MUST be the repository root (so the uv workspace lockfile is in scope):
#   docker build -f backend/Dockerfile -t kinetic-backend .

# ---------- Builder ----------
FROM python:3.12-slim AS builder

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONDONTWRITEBYTECODE=1

COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv

WORKDIR /app

# Copy workspace manifests first for layer-friendly caching.
COPY pyproject.toml uv.lock ./
COPY backend/pyproject.toml backend/pyproject.toml
COPY mcp/pyproject.toml mcp/pyproject.toml

# Resolve and install only the backend's runtime deps into a project venv at /app/.venv.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --package kinetic-backend --no-install-project

# Copy backend source last so code edits don't bust the dependency layer.
COPY backend/app /app/backend/app

# Install the backend package itself.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --package kinetic-backend


# ---------- Runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

# curl is needed for HEALTHCHECK.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --no-create-home kinetic

WORKDIR /app

COPY --from=builder --chown=kinetic:kinetic /app/.venv /app/.venv
COPY --from=builder --chown=kinetic:kinetic /app/backend/app /app/app

USER kinetic
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
