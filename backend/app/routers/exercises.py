from datetime import UTC, datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import get_database
from app.models.exercise import ExerciseCreate, ExerciseResponse, PRResponse, PRSet

router = APIRouter(prefix="/exercises", tags=["Exercises"])


@router.get("/", response_model=list[ExerciseResponse], summary="List all exercises")
async def list_exercises(current_user: str = Depends(get_current_user)):
    db = get_database()
    docs = await db["exercises"].find({"user_id": current_user}).sort("name", 1).to_list(None)
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    return docs


@router.post("/", response_model=ExerciseResponse, status_code=201, summary="Create an exercise")
async def create_exercise(body: ExerciseCreate, current_user: str = Depends(get_current_user)):
    db = get_database()
    doc = {**body.model_dump(), "user_id": current_user, "created_at": datetime.now(UTC)}
    result = await db["exercises"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.get("/{exercise_id}/pr", response_model=PRResponse, summary="Get the personal record for an exercise")
async def get_exercise_pr(exercise_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(exercise_id):
        raise HTTPException(status_code=400, detail="Invalid exercise ID")
    db = get_database()
    exercise = await db["exercises"].find_one({"_id": ObjectId(exercise_id), "user_id": current_user})
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")

    pipeline = [
        {"$match": {"user_id": current_user, "exercises.exercise_id": exercise_id}},
        {"$unwind": "$exercises"},
        {"$match": {"exercises.exercise_id": exercise_id}},
        {"$unwind": "$exercises.sets"},
        {"$project": {
            "workout_id": {"$toString": "$_id"},
            "date": "$date",
            "weight": "$exercises.sets.weight",
            "reps": "$exercises.sets.reps",
        }},
        {"$sort": {"weight": -1, "reps": -1}},
        {"$limit": 1},
    ]
    results = await db["workouts"].aggregate(pipeline).to_list(1)

    if not results:
        return PRResponse(exercise_id=exercise_id, name=exercise["name"], pr=None)

    best = results[0]
    return PRResponse(
        exercise_id=exercise_id,
        name=exercise["name"],
        pr=PRSet(weight=best["weight"], reps=best["reps"]),
        workout_id=best["workout_id"],
        date=best["date"],
    )
