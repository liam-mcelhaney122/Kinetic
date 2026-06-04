import hashlib
import secrets
from datetime import UTC, datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.database import get_database
from app.models.api_key import ApiKeyCreate, ApiKeyCreatedResponse, ApiKeyResponse

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


@router.post("/", response_model=ApiKeyCreatedResponse, status_code=201)
async def create_api_key(
    body: ApiKeyCreate,
    current_user: str = Depends(get_current_user),
):
    db = get_database()
    raw_key = "kt_" + secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    now = datetime.now(UTC)
    doc = {
        "user_id": current_user,
        "name": body.name,
        "key_hash": key_hash,
        "created_at": now,
        "last_used": None,
    }
    result = await db["api_keys"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {**doc, "raw_key": raw_key}


@router.get("/", response_model=list[ApiKeyResponse])
async def list_api_keys(current_user: str = Depends(get_current_user)):
    db = get_database()
    docs = await db["api_keys"].find({"user_id": current_user}).to_list(None)
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    return docs


@router.delete("/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: str,
    current_user: str = Depends(get_current_user),
):
    if not ObjectId.is_valid(key_id):
        raise HTTPException(status_code=400, detail="Invalid key ID")
    db = get_database()
    result = await db["api_keys"].delete_one(
        {"_id": ObjectId(key_id), "user_id": current_user}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
