# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Kinetic is a personal strength-training app with four components:

1. **`backend/`** — FastAPI + Motor (async MongoDB) REST API, runs on port 8000
2. **`frontend/`** — React + Vite + Clerk SPA, runs on port 5173
3. **`mcp/`** — MCP server (`server.py`) that wraps the REST API as Claude tools
4. **`.claude/agents/kinetic.md`** — Claude subagent definition for the AI trainer persona (uses `claude-opus-4-7`)

The MCP server is a thin HTTP proxy: every tool calls the backend API via `httpx`. The AI trainer logic (progressive overload rules, set/rep schemes) lives in `prompt.md` and `.claude/agents/kinetic.md`, not in application code.

### Data model

MongoDB collections:
- **`exercises`** — exercise library (`_id`, `name`, `desc`, `svg`, `user_id`, `created_at`)
- **`workouts`** — workout sessions (`_id`, `name`, `date`, `status: planned|active|completed`, `exercises[]`, `user_id`, `created_at`, `completed_at`)
- **`profiles`** — user preferences (`_id` = Clerk user ID, `unit: kg|lbs`, `custom_instructions`)
- **`api_keys`** — hashed API keys for MCP auth (`_id`, `user_id`, `name`, `key_hash`, `created_at`, `last_used`)

All `_id` fields are MongoDB ObjectIds serialized as strings in the API. Workout `status` transitions: `planned` → `active` → `completed`.

### Backend layout

```
backend/app/
  main.py          — FastAPI app, lifespan (mongo connect/retry), middleware, health endpoints
  config.py        — pydantic-settings Settings class; all env vars centralized here
  logging.py       — structlog configuration (JSON in prod, console in dev)
  database.py      — Motor client singleton, tenacity retry on connect, create_indexes
  auth.py          — Clerk JWT verification + API key verification
  trainer_prompt.py — build_system_prompt() used by /workouts/generate
  models/
    exercise.py    — ExerciseCreate, ExerciseResponse, PRResponse
    workout.py     — Set, WorkoutExercise, WorkoutCreate/Update/Complete/Response, VolumeResponse
    profile.py     — ProfileUpdate, ProfileResponse
    api_key.py     — ApiKeyCreate, ApiKeyCreatedResponse, ApiKeyResponse
  routers/
    exercises.py   — GET/POST /exercises, GET /exercises/{id}/pr
    workouts.py    — CRUD + /workouts/{id}/start + /workouts/{id}/complete + /workouts/{id}/volume
    generate.py    — POST /workouts/generate, POST /workouts/{id}/adjust  (uses OpenAI)
    auth.py        — POST /auth/dev-login (dev only), GET /auth/me
    profile.py     — GET/PATCH /profile
    admin.py       — DELETE /admin/reset
    api_keys.py    — POST/GET/DELETE /api-keys
  scripts/
    seed_workouts.py — seed a year of workout history (run with: python -m app.scripts.seed_workouts)
```

Health endpoints:
- `GET /health` — liveness (no DB call, always fast)
- `GET /health/ready` — readiness (pings MongoDB; returns 503 if unreachable)

## Environment Setup

Copy `.env.example` to `.env` and fill in credentials. The root `.env.example` is the single source of truth for all required variables (backend + MCP + frontend).

```bash
cp .env.example .env
# edit .env with real values
```

## Common Commands

**Install all dependencies (uv workspace):**
```bash
uv sync --all-packages
```

**Start dev stack (API + MongoDB via Docker):**
```bash
docker compose up --build
```

**Run backend locally (outside Docker, requires a running MongoDB):**
```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

**Run the MCP server:**
```bash
cd mcp
uv run python server.py
# or: mcp run server.py
```

**Seed workout history:**
```bash
cd backend
uv run python -m app.scripts.seed_workouts --url http://localhost:8000
```

**Lint backend:**
```bash
uv run ruff check backend/app
```

**Check API health:**
```bash
curl http://localhost:8000/health        # liveness
curl http://localhost:8000/health/ready  # readiness (needs Mongo)
```

**Interactive API docs:** `http://localhost:8000/docs`

## MCP Tools

The MCP server (`mcp/server.py`) exposes these tools to Claude agents:

| Tool | Method | Endpoint |
|---|---|---|
| `list_exercises` | GET | `/exercises` |
| `create_exercise` | POST | `/exercises` |
| `get_exercise_pr` | GET | `/exercises/{id}/pr` |
| `list_workouts` | GET | `/workouts` |
| `get_workout` | GET | `/workouts/{id}` |
| `create_workout` | POST | `/workouts` |
| `update_workout` | PATCH | `/workouts/{id}` |
| `complete_workout` | POST | `/workouts/{id}/complete` |
| `get_workout_volume` | GET | `/workouts/{id}/volume` |
| `generate_workout` | POST | `/workouts/generate` |
| `get_profile` | GET | `/profile` |
| `health_check` | GET | `/health` |

`KINETIC_API_URL` env var controls what the MCP server points at (default: `http://localhost:8000`).  
In production set `KINETIC_API_URL=https://kinetic-api.fly.dev` (or your deployed URL).

## AI Trainer Agent

The `kinetic` subagent (`.claude/agents/kinetic.md`) follows a strict tool sequence:
`list_exercises` → `list_workouts` → analyze → `create_workout` → present plan.

Progressive overload rules and set/rep defaults are documented in `prompt.md`.  
New exercises must be created via `create_exercise` before referencing them in a workout.

## Deployment

The backend deploys to **Fly.io** as a Docker container. MongoDB runs on **Atlas** (not in Docker in production).

```bash
# First time
fly launch --no-deploy --config infra/fly.toml

# Set secrets (run once, rotated via fly secrets set)
fly secrets set \
  MONGO_URI="mongodb+srv://..." \
  OPENAI_API_KEY="sk-..." \
  CLERK_JWKS_URL="https://..." \
  CLERK_AUDIENCE="..." \
  MCP_DEV_SECRET=""   # leave empty to disable dev auth in prod

# Deploy
fly deploy --config infra/fly.toml
```

CI/CD runs on GitHub Actions (`.github/workflows/ci.yml`):
- Every PR: backend ruff + mypy, frontend ESLint + tsc, Docker build
- Push to `main`: above + `fly deploy` (requires `FLY_API_TOKEN` secret in GitHub)
