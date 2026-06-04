from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.database import get_database

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.delete("/reset", summary="Delete all data for the current user")
async def reset_user_data(
    confirm: bool = Query(False),
    current_user: str = Depends(get_current_user),
):
    if not confirm:
        raise HTTPException(status_code=400, detail="Pass ?confirm=true to confirm reset")
    db = get_database()
    workouts = await db["workouts"].delete_many({"user_id": current_user})
    exercises = await db["exercises"].delete_many({"user_id": current_user})
    api_keys = await db["api_keys"].delete_many({"user_id": current_user})
    await db["profiles"].delete_one({"_id": current_user})
    return {
        "deleted_workouts": workouts.deleted_count,
        "deleted_exercises": exercises.deleted_count,
        "deleted_api_keys": api_keys.deleted_count,
    }
