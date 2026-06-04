import hashlib as _hashlib
import hmac as _hmac
import json
import os
from contextlib import asynccontextmanager
from datetime import date as _date

import httpx
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP, Context
from openai import AsyncOpenAI

from trainer_prompt import build_system_prompt

load_dotenv()

BASE_URL = os.getenv("KINETIC_API_URL", "http://localhost:8000")
_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
_CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")

_TRAINER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_exercises",
            "description": "Return all exercises in the exercise library, sorted A-Z by name.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_workouts",
            "description": "Return all past workouts sorted newest first, including full exercise and set data. Use this to review training history before generating a new workout plan.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_exercise",
            "description": "Add a new exercise to the library. Call this before create_workout if a needed exercise doesn't exist yet.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "desc": {"type": "string"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_workout",
            "description": "Save the AI-generated workout plan as a planned workout. date format: YYYY-MM-DD. exercises: [{exercise_id, name, sets: [{reps, weight}]}]",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "date": {"type": "string"},
                    "exercises": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "exercise_id": {"type": "string"},
                                "name": {"type": "string"},
                                "sets": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "reps": {"type": "integer"},
                                            "weight": {"type": "number"},
                                        },
                                        "required": ["reps", "weight"],
                                    },
                                },
                            },
                            "required": ["exercise_id", "name", "sets"],
                        },
                    },
                },
                "required": ["name", "date", "exercises"],
            },
        },
    },
]


@asynccontextmanager
async def app_lifespan(server: FastMCP):
    headers: dict[str, str] = {}
    if _CLERK_SECRET_KEY:
        token = _hmac.new(
            _CLERK_SECRET_KEY.encode(), b"kinetic-mcp-service-v1", _hashlib.sha256
        ).hexdigest()
        headers["X-Service-Token"] = token
    elif api_key := os.getenv("KINETIC_API_KEY", ""):
        headers["Authorization"] = f"Bearer {api_key}"
    async with httpx.AsyncClient(
        base_url=BASE_URL, headers=headers, follow_redirects=True
    ) as client:
        yield {"client": client}


mcp = FastMCP(
    "Kinetic",
    lifespan=app_lifespan,
    host=os.getenv("HOST", "127.0.0.1"),
    port=int(os.getenv("PORT", "8000")),
)


# ── Profile ───────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_profile(ctx: Context) -> dict:
    """Return the user profile: preferred weight unit ('kg' or 'lbs') and any custom training instructions to incorporate into the plan."""
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.get("/profile/")
    r.raise_for_status()
    return r.json()


# ── Health ────────────────────────────────────────────────────────────────────

@mcp.tool()
async def health_check(ctx: Context) -> dict:
    """Check whether the Kinetic API and its MongoDB connection are healthy."""
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.get("/health")
    r.raise_for_status()
    return r.json()


# ── Exercises ─────────────────────────────────────────────────────────────────

@mcp.tool()
async def list_exercises(ctx: Context) -> list:
    """Return all exercises in the exercise library, sorted A-Z by name."""
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.get("/exercises/")
    r.raise_for_status()
    return r.json()


@mcp.tool()
async def create_exercise(name: str, ctx: Context, desc: str | None = None, svg: str | None = None) -> dict:
    """Add a new exercise to the library. desc is an optional description; svg is an optional icon URL."""
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.post("/exercises/", json={"name": name, "desc": desc, "svg": svg})
    r.raise_for_status()
    return r.json()


@mcp.tool()
async def get_exercise_pr(exercise_id: str, ctx: Context) -> dict:
    """
    Return the personal record (heaviest single set) for an exercise across all workout history.
    The `pr` field is null if the exercise exists but has never been performed in a workout.
    """
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.get(f"/exercises/{exercise_id}/pr")
    r.raise_for_status()
    return r.json()


# ── Workouts ──────────────────────────────────────────────────────────────────

@mcp.tool()
async def list_workouts(ctx: Context) -> list:
    """
    Return all past workouts sorted newest first, including full exercise and set data.
    Use this to review training history before generating a new workout plan.
    """
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.get("/workouts/")
    r.raise_for_status()
    return r.json()


@mcp.tool()
async def get_workout(workout_id: str, ctx: Context) -> dict:
    """Fetch a single workout by its ID."""
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.get(f"/workouts/{workout_id}")
    r.raise_for_status()
    return r.json()


@mcp.tool()
async def create_workout(name: str, date: str, exercises: list[dict], ctx: Context) -> dict:
    """
    Save an AI-generated workout plan. Status defaults to 'planned'.

    date format: YYYY-MM-DD
    exercises format:
      [{"exercise_id": "<id>", "name": "<name>", "sets": [{"reps": 8, "weight": 60.0}]}]

    Returns the created workout including its id.
    """
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.post("/workouts/", json={"name": name, "date": date, "exercises": exercises})
    r.raise_for_status()
    return r.json()


@mcp.tool()
async def update_workout(workout_id: str, exercises: list[dict], ctx: Context) -> dict:
    """
    Replace the exercise plan on an active workout.
    Only works while the workout status is 'active'. Returns 409 if already completed.

    exercises format: same as create_workout
    """
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.patch(f"/workouts/{workout_id}", json={"exercises": exercises})
    r.raise_for_status()
    return r.json()


@mcp.tool()
async def complete_workout(workout_id: str, exercises: list[dict], ctx: Context) -> dict:
    """
    Submit the actual recorded sets and mark the workout completed.
    Returns 409 if the workout is already completed.

    exercises format: same as create_workout
    """
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.post(f"/workouts/{workout_id}/complete", json={"exercises": exercises})
    r.raise_for_status()
    return r.json()


@mcp.tool()
async def get_workout_volume(workout_id: str, ctx: Context) -> dict:
    """
    Return the total volume (sum of weight × reps) for a workout, plus a per-exercise breakdown.
    """
    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]
    r = await client.get(f"/workouts/{workout_id}/volume")
    r.raise_for_status()
    return r.json()


# ── AI Generation ─────────────────────────────────────────────────────────────

@mcp.tool()
async def generate_workout(goal: str, ctx: Context) -> str:
    """
    Use an LLM personal trainer to generate a workout plan from a plain-English goal.
    The trainer fetches the exercise library and workout history, then calls create_workout.
    Example goals: "push day focused on chest", "leg day, heavy compounds", "upper body hypertrophy".
    """
    if not _OPENAI_API_KEY:
        return "OPENAI_API_KEY is not configured. Add it to mcp/.env and restart the server."

    client: httpx.AsyncClient = ctx.request_context.lifespan_context["client"]

    r = await client.get("/profile/")
    r.raise_for_status()
    profile = r.json()

    today = str(_date.today())
    system_prompt = build_system_prompt(profile, today)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": goal},
    ]

    ai_client = AsyncOpenAI(api_key=_OPENAI_API_KEY)

    async def _run_tool(name: str, args: dict) -> str:
        if name == "list_exercises":
            resp = await client.get("/exercises/")
        elif name == "list_workouts":
            resp = await client.get("/workouts/")
        elif name == "create_exercise":
            resp = await client.post("/exercises/", json=args)
        elif name == "create_workout":
            resp = await client.post("/workouts/", json=args)
        else:
            return json.dumps({"error": f"unknown tool: {name}"})
        resp.raise_for_status()
        return json.dumps(resp.json(), default=str)

    for _ in range(12):
        response = await ai_client.chat.completions.create(
            model=_OPENAI_MODEL,
            messages=messages,
            tools=_TRAINER_TOOLS,
        )
        choice = response.choices[0]
        messages.append(choice.message)

        if choice.finish_reason == "tool_calls":
            for tc in choice.message.tool_calls:
                args = json.loads(tc.function.arguments)
                result = await _run_tool(tc.function.name, args)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
        else:
            return choice.message.content or "Workout created."

    return "Agent loop exceeded maximum iterations."


if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "stdio")
    mcp.run(transport=transport)
