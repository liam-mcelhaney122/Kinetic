import json
from datetime import UTC, datetime
from datetime import date as _date

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_database
from app.models.workout import WorkoutResponse
from app.trainer_prompt import build_system_prompt

router = APIRouter(prefix="/workouts", tags=["Generate"])

_TOOLS = [
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
            "description": "Save the AI-generated workout as an active workout. date format: YYYY-MM-DD. exercises: [{exercise_id, name, sets: [{reps, weight}], reasoning, coach_note}]",
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
                                            "set_type": {"type": "string", "enum": ["normal", "drop"]},
                                        },
                                        "required": ["reps", "weight"],
                                    },
                                },
                                "reasoning": {"type": "string"},
                                "coach_note": {"type": "string"},
                                "superset_id": {"type": "string"},
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


class GenerateRequest(BaseModel):
    goal: str


class AdjustRequest(BaseModel):
    instruction: str


_ADJUST_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "update_exercises",
            "description": "Replace the workout's exercise list with the adjusted plan. Call this exactly once with the complete revised exercise list.",
            "parameters": {
                "type": "object",
                "required": ["exercises"],
                "properties": {
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
                                            "set_type": {"type": "string", "enum": ["normal", "drop"]},
                                        },
                                        "required": ["reps", "weight"],
                                    },
                                },
                                "reasoning": {"type": "string"},
                                "coach_note": {"type": "string"},
                                "superset_id": {"type": "string"},
                            },
                            "required": ["exercise_id", "name", "sets"],
                        },
                    },
                },
            },
        },
    },
]


def _build_adjust_prompt(profile: dict, today: str, workout: dict, exercise_library: list) -> str:
    unit = profile.get("unit", "lbs")
    exercises_json = json.dumps(workout.get("exercises", []), indent=2, default=str)
    library_json = json.dumps([{"_id": e["_id"], "name": e["name"]} for e in exercise_library], indent=2, default=str)
    return f"""You are Kinetic, a personal strength training AI making a targeted mid-workout adjustment.

The user is currently doing their workout and has asked you to modify it. Change ONLY what the instruction asks. Preserve all other exercises, sets, weights, reasoning, and coach_note values exactly as-is.

User profile:
- Preferred weight unit: {unit}
- Today's date: {today}

## Current Workout: {workout.get("name", "")}

{exercises_json}

## Available Exercises (for substitutions)

{library_json}

## Rules

- Change only what the instruction explicitly asks. Do not reorder, rename, or adjust anything else.
- All weights must be whole numbers divisible by 5. No decimals.
- Plated barbell lifts: multiples of 5 {unit} (45, 95, 115, 135, 155, 185 …)
- Machine/cable lifts: multiples of 5 {unit} (50, 55, 60, 65, 70, 80, 90, 100 …)
- exercise_id MUST be the exact _id from the available exercises list above. For a new exercise not in the list, you may still use the name but keep the exercise_id from any closely matching entry; if truly no match exists, keep the original exercise_id.
- set_type defaults to "normal"; use "drop" only for an explicit drop-set instruction.
- superset_id: preserve existing values; assign matching letters for new supersets.
- Call update_exercises exactly once with the complete revised exercise list (include ALL exercises, not just changed ones)."""


@router.post("/generate", response_model=WorkoutResponse, status_code=201)
async def generate_workout(body: GenerateRequest, current_user: str = Depends(get_current_user)):
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    db = get_database()

    profile_doc = await db["profiles"].find_one({"_id": current_user})
    profile = {"unit": "kg", "custom_instructions": ""}
    if profile_doc:
        profile["unit"] = profile_doc.get("unit", "kg")
        profile["custom_instructions"] = profile_doc.get("custom_instructions", "")

    model = (profile_doc or {}).get("openai_model") or settings.openai_model

    today = str(_date.today())
    system_prompt = build_system_prompt(profile, today)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": body.goal},
    ]

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    created_workout = None

    for _ in range(12):
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            tools=_TOOLS,

        )
        choice = response.choices[0]
        messages.append(choice.message)

        if choice.finish_reason == "tool_calls":
            for tc in choice.message.tool_calls:
                args = json.loads(tc.function.arguments)
                name = tc.function.name

                if name == "list_exercises":
                    docs = await db["exercises"].find({"user_id": current_user}).sort("name", 1).to_list(None)
                    for d in docs:
                        d["_id"] = str(d["_id"])
                    result = docs

                elif name == "list_workouts":
                    docs = await db["workouts"].find({"user_id": current_user}).sort("date", -1).to_list(30)
                    for d in docs:
                        d["_id"] = str(d["_id"])
                    result = docs

                elif name == "create_exercise":
                    now = datetime.now(UTC)
                    doc = {
                        "name": args["name"],
                        "desc": args.get("desc"),
                        "svg": None,
                        "user_id": current_user,
                        "created_at": now,
                    }
                    res = await db["exercises"].insert_one(doc)
                    doc["_id"] = str(res.inserted_id)
                    result = doc

                elif name == "create_workout":
                    now = datetime.now(UTC)
                    exercises = [
                        {
                            "exercise_id": ex["exercise_id"],
                            "name": ex["name"],
                            "sets": [
                                {
                                    "reps": s["reps"],
                                    "weight": s["weight"],
                                    "set_type": s.get("set_type", "normal"),
                                }
                                for s in ex["sets"]
                            ],
                            "reasoning": ex.get("reasoning", ""),
                            "coach_note": ex.get("coach_note", ""),
                            "superset_id": ex.get("superset_id"),
                        }
                        for ex in args["exercises"]
                    ]
                    doc = {
                        "name": args["name"],
                        "date": args["date"],
                        "exercises": exercises,
                        "user_id": current_user,
                        "status": "active",
                        "completed_at": None,
                        "created_at": now,
                    }
                    res = await db["workouts"].insert_one(doc)
                    doc["_id"] = str(res.inserted_id)
                    created_workout = doc
                    result = doc

                else:
                    result = {"error": f"unknown tool: {name}"}

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result, default=str),
                })
        else:
            break

    if created_workout is None:
        raise HTTPException(status_code=500, detail="LLM did not create a workout")

    return created_workout


@router.post("/{workout_id}/adjust", response_model=WorkoutResponse)
async def adjust_workout(workout_id: str, body: AdjustRequest, current_user: str = Depends(get_current_user)):
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")
    if not ObjectId.is_valid(workout_id):
        raise HTTPException(status_code=400, detail="Invalid workout ID")

    db = get_database()

    workout_doc = await db["workouts"].find_one({"_id": ObjectId(workout_id), "user_id": current_user})
    if not workout_doc:
        raise HTTPException(status_code=404, detail="Workout not found")
    if workout_doc.get("status") == "completed":
        raise HTTPException(status_code=409, detail="Cannot adjust a completed workout")

    profile_doc = await db["profiles"].find_one({"_id": current_user})
    profile = {"unit": "kg", "custom_instructions": ""}
    if profile_doc:
        profile["unit"] = profile_doc.get("unit", "kg")
        profile["custom_instructions"] = profile_doc.get("custom_instructions", "")

    model = (profile_doc or {}).get("openai_model") or settings.openai_model

    exercise_docs = await db["exercises"].find({"user_id": current_user}).sort("name", 1).to_list(None)
    for d in exercise_docs:
        d["_id"] = str(d["_id"])

    workout_doc["_id"] = str(workout_doc["_id"])
    today = str(_date.today())
    system_prompt = _build_adjust_prompt(profile, today, workout_doc, exercise_docs)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": body.instruction},
    ]

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    updated_exercises = None

    for _ in range(6):
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            tools=_ADJUST_TOOLS,

        )
        choice = response.choices[0]
        messages.append(choice.message)

        if choice.finish_reason == "tool_calls":
            for tc in choice.message.tool_calls:
                args = json.loads(tc.function.arguments)
                if tc.function.name == "update_exercises":
                    updated_exercises = [
                        {
                            "exercise_id": ex["exercise_id"],
                            "name": ex["name"],
                            "sets": [
                                {
                                    "reps": s["reps"],
                                    "weight": s["weight"],
                                    "set_type": s.get("set_type", "normal"),
                                }
                                for s in ex["sets"]
                            ],
                            "reasoning": ex.get("reasoning", ""),
                            "coach_note": ex.get("coach_note", ""),
                            "superset_id": ex.get("superset_id"),
                        }
                        for ex in args["exercises"]
                    ]
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps({"status": "ok"}),
                    })
                    break
            if updated_exercises is not None:
                break
        else:
            break

    if updated_exercises is None:
        raise HTTPException(status_code=500, detail="LLM did not return updated exercises")

    result = await db["workouts"].find_one_and_update(
        {"_id": ObjectId(workout_id), "user_id": current_user},
        {"$set": {"exercises": updated_exercises}},
        return_document=True,
    )
    result["_id"] = str(result["_id"])
    return result
