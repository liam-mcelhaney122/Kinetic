import hashlib
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_database

router = APIRouter(prefix="/auth", tags=["Auth"])


class DevLoginRequest(BaseModel):
    user_id: str
    secret: str


@router.post("/dev-login", summary="Auto-auth for MCP server (dev only)")
async def dev_login(body: DevLoginRequest):
    settings = get_settings()
    if settings.is_production or not settings.mcp_dev_secret:
        raise HTTPException(status_code=403, detail="Dev auth is not enabled on this server")
    if not secrets.compare_digest(body.secret, settings.mcp_dev_secret):
        raise HTTPException(status_code=403, detail="Invalid dev secret")

    db = get_database()
    raw_key = "kt_" + secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    now = datetime.now(UTC)
    await db["api_keys"].insert_one({
        "user_id": body.user_id,
        "name": "MCP Dev Auto",
        "key_hash": key_hash,
        "created_at": now,
        "last_used": None,
    })
    return {"raw_key": raw_key}


@router.get("/me", summary="Return the current authenticated user ID")
async def get_me(current_user: str = Depends(get_current_user)):
    return {"user_id": current_user}
