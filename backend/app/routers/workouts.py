from datetime import UTC, datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import get_database
from app.models.workout import (
    ExerciseVolume,
    VolumeResponse,
    WorkoutComplete,
    WorkoutCreate,
    WorkoutResponse,
    WorkoutUpdate,
)

router = APIRouter(prefix="/workouts", tags=["Workouts"])


@router.get("/", response_model=list[WorkoutResponse], summary="List all workouts (newest first)")
async def list_workouts(current_user: str = Depends(get_current_user)):
    db = get_database()
    docs = await db["workouts"].find({"user_id": current_user}).sort("date", -1).to_list(None)
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    return docs


@router.post("/", response_model=WorkoutResponse, status_code=201, summary="Create an active workout")
async def create_workout(body: WorkoutCreate, current_user: str = Depends(get_current_user)):
    db = get_database()
    doc = {
        **body.model_dump(mode="json"),
        "user_id": current_user,
        "completed_at": None,
        "created_at": datetime.now(UTC),
    }
    result = await db["workouts"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.get("/{workout_id}", response_model=WorkoutResponse, summary="Get a workout by ID")
async def get_workout(workout_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(workout_id):
        raise HTTPException(status_code=400, detail="Invalid workout ID")
    db = get_database()
    doc = await db["workouts"].find_one({"_id": ObjectId(workout_id), "user_id": current_user})
    if doc is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    doc["_id"] = str(doc["_id"])
    return doc


@router.patch("/{workout_id}", response_model=WorkoutResponse,
              summary="Update the exercise plan for an active workout")
async def update_workout(workout_id: str, body: WorkoutUpdate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(workout_id):
        raise HTTPException(status_code=400, detail="Invalid workout ID")
    db = get_database()
    doc = await db["workouts"].find_one({"_id": ObjectId(workout_id), "user_id": current_user})
    if doc is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    if doc["status"] == "completed":
        raise HTTPException(status_code=409, detail="Cannot modify a completed workout")
    exercises = body.model_dump()["exercises"]
    await db["workouts"].update_one(
        {"_id": ObjectId(workout_id)},
        {"$set": {"exercises": exercises}},
    )
    doc.update({"exercises": exercises})
    doc["_id"] = str(doc["_id"])
    return doc


@router.post("/{workout_id}/start", response_model=WorkoutResponse,
             summary="Transition a planned workout to active")
async def start_workout(workout_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(workout_id):
        raise HTTPException(status_code=400, detail="Invalid workout ID")
    db = get_database()
    doc = await db["workouts"].find_one({"_id": ObjectId(workout_id), "user_id": current_user})
    if doc is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    if doc["status"] != "planned":
        raise HTTPException(status_code=409, detail="Only planned workouts can be started")
    started_at = datetime.now(UTC)
    await db["workouts"].update_one(
        {"_id": ObjectId(workout_id)},
        {"$set": {"status": "active", "created_at": started_at}},
    )
    doc.update({"status": "active", "created_at": started_at})
    doc["_id"] = str(doc["_id"])
    return doc


@router.post("/{workout_id}/complete", response_model=WorkoutResponse,
             summary="Submit recorded sets and mark workout completed")
async def complete_workout(workout_id: str, body: WorkoutComplete, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(workout_id):
        raise HTTPException(status_code=400, detail="Invalid workout ID")
    db = get_database()
    doc = await db["workouts"].find_one({"_id": ObjectId(workout_id), "user_id": current_user})
    if doc is None:
        raise HTTPException(status_code=404, detail="Workout not found")
    if doc["status"] == "completed":
        raise HTTPException(status_code=409, detail="Workout is already completed")
    completed_at = datetime.now(UTC)
    exercises = body.model_dump()["exercises"]
    await db["workouts"].update_one(
        {"_id": ObjectId(workout_id)},
        {"$set": {
            "exercises": exercises,
            "status": "completed",
            "completed_at": completed_at,
        }},
    )
    doc.update({
        "exercises": exercises,
        "status": "completed",
        "completed_at": completed_at,
    })
    doc["_id"] = str(doc["_id"])
    return doc


@router.delete("/{workout_id}", status_code=204, summary="Delete a workout")
async def delete_workout(workout_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(workout_id):
        raise HTTPException(status_code=400, detail="Invalid workout ID")
    db = get_database()
    result = await db["workouts"].delete_one({"_id": ObjectId(workout_id), "user_id": current_user})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workout not found")


@router.get("/{workout_id}/volume", response_model=VolumeResponse, summary="Calculate total and per-exercise volume for a workout")
async def get_workout_volume(workout_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(workout_id):
        raise HTTPException(status_code=400, detail="Invalid workout ID")
    db = get_database()
    doc = await db["workouts"].find_one({"_id": ObjectId(workout_id), "user_id": current_user})
    if doc is None:
        raise HTTPException(status_code=404, detail="Workout not found")

    exercise_volumes = []
    total = 0.0
    for ex in doc.get("exercises", []):
        vol = sum(s["weight"] * s["reps"] for s in ex.get("sets", []))
        total += vol
        exercise_volumes.append(ExerciseVolume(
            exercise_id=ex["exercise_id"], name=ex["name"], volume=vol
        ))

    return VolumeResponse(workout_id=workout_id, total_volume=total, exercises=exercise_volumes)
