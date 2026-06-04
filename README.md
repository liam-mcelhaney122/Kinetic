# Kinetic

Personal strength-training app with an AI coach powered by Claude.

## Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Motor (async MongoDB) |
| Database | MongoDB 7 (Docker in dev, Atlas in prod) |
| Frontend | React 18 + Vite + Clerk auth |
| AI coach | Claude via MCP server |
| Deploy | Fly.io (backend) + Vercel/Cloudflare (frontend) |

## Quick start

### 1. Install dependencies

```bash
# Python (backend + MCP) — requires uv
uv sync --all-packages

# Node (frontend)
cd frontend && npm ci
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in MONGO_*, CLERK_*, OPENAI_API_KEY, VITE_* values
```

### 3. Start the dev stack

```bash
# API + MongoDB via Docker Compose
docker compose up --build

# Frontend (separate terminal)
cd frontend && npm run dev
```

The API is at `http://localhost:8000` and the app at `http://localhost:5173`.

## Environment variables

All variables are documented in [`.env.example`](.env.example).

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | Full MongoDB connection string |
| `MONGO_DB` | No | Database name (default: `kinetic`) |
| `CLERK_JWKS_URL` | Yes | Clerk JWKS endpoint for JWT verification |
| `CLERK_AUDIENCE` | Prod | JWT audience claim (enforced in production) |
| `OPENAI_API_KEY` | Yes | Used by `/workouts/generate` |
| `OPENAI_MODEL` | No | OpenAI model (default: `gpt-4o`) |
| `MCP_DEV_SECRET` | Dev | Shared secret for MCP auto-login (disabled in prod) |
| `VITE_API_URL` | Yes | Backend URL consumed by the frontend |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key for frontend |

## Development commands

```bash
# Backend lint
uv run ruff check backend/app

# Backend type-check
uv run mypy backend/app --ignore-missing-imports

# Frontend lint
cd frontend && npm run lint

# Frontend type-check
cd frontend && npm run typecheck

# Seed workout history
cd backend && uv run python -m app.scripts.seed_workouts

# Health checks
curl http://localhost:8000/health         # liveness
curl http://localhost:8000/health/ready   # readiness (needs Mongo)
```

## Deployment

See [`CLAUDE.md`](CLAUDE.md#deployment) for the full Fly.io deploy workflow.

The CI pipeline (`.github/workflows/ci.yml`) runs lint, typecheck, and Docker build on every PR, and deploys to Fly.io on push to `main`.

## Project structure

```
kinetic/
├── backend/           FastAPI app + models + routers
├── frontend/          React + Vite SPA
├── mcp/               MCP server (Claude tool proxy)
├── infra/             fly.toml deployment config
├── .github/           CI/CD workflows
├── .env.example       All required environment variables
└── docker-compose.yml Local dev stack (Mongo + API)
```
