from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import get_database
from app.models.profile import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])

_DEFAULT = {"unit": "kg", "custom_instructions": "", "openai_model": ""}


@router.get("/", response_model=ProfileResponse, summary="Get user profile")
async def get_profile(current_user: str = Depends(get_current_user)):
    db = get_database()
    doc = await db["profiles"].find_one({"_id": current_user})
    if doc is None:
        return _DEFAULT
    doc.pop("_id", None)
    return doc


@router.patch("/", response_model=ProfileResponse, summary="Update user profile")
async def update_profile(body: ProfileUpdate, current_user: str = Depends(get_current_user)):
    db = get_database()
    data = body.model_dump()
    await db["profiles"].update_one(
        {"_id": current_user},
        {"$set": data},
        upsert=True,
    )
    return data
