import hashlib
import hmac as _hmac
import secrets
import time
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import HTTPException, Request
from jose import JWTError, jwt

from app.config import get_settings
from app.database import get_database

_jwks_cache: dict[str, Any] = {}
_JWKS_TTL = 3600

_SERVICE_HMAC_KEY = b"kinetic-mcp-service-v1"
_service_user_id: str | None = None


async def _get_jwks() -> list[dict]:
    settings = get_settings()
    now = time.time()
    if _jwks_cache.get("keys") and now - _jwks_cache.get("fetched_at", 0) < _JWKS_TTL:
        return _jwks_cache["keys"]
    if not settings.clerk_jwks_url:
        raise HTTPException(status_code=500, detail="CLERK_JWKS_URL not configured")
    async with httpx.AsyncClient() as client:
        r = await client.get(settings.clerk_jwks_url, timeout=10)
        r.raise_for_status()
    keys = r.json()["keys"]
    _jwks_cache["keys"] = keys
    _jwks_cache["fetched_at"] = now
    return keys


async def _verify_clerk_jwt(token: str) -> str:
    settings = get_settings()
    keys = await _get_jwks()
    # In production we require an audience claim. In dev we still verify when
    # configured but tolerate its absence.
    options = {"verify_aud": bool(settings.clerk_audience)}
    try:
        claims = jwt.decode(
            token,
            {"keys": keys},
            algorithms=["RS256"],
            audience=settings.clerk_audience or None,
            options=options,
        )
        return claims["sub"]
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc


async def _verify_api_key(token: str) -> str:
    db = get_database()
    key_hash = hashlib.sha256(token.encode()).hexdigest()
    doc = await db["api_keys"].find_one({"key_hash": key_hash})
    if not doc:
        raise HTTPException(status_code=401, detail="Invalid API key")
    await db["api_keys"].update_one(
        {"_id": doc["_id"]},
        {"$set": {"last_used": datetime.now(UTC).isoformat()}},
    )
    return doc["user_id"]


def _expected_service_token(secret_key: str) -> str:
    return _hmac.new(secret_key.encode(), _SERVICE_HMAC_KEY, hashlib.sha256).hexdigest()


async def _get_clerk_owner_user_id(secret_key: str) -> str | None:
    """Fetch and cache the first (owner) Clerk user ID using the secret key."""
    global _service_user_id
    if _service_user_id:
        return _service_user_id
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.clerk.com/v1/users",
            headers={"Authorization": f"Bearer {secret_key}"},
            params={"limit": 1},
            timeout=10,
        )
        if r.status_code == 200 and r.json():
            _service_user_id = r.json()[0]["id"]
    return _service_user_id


def _looks_like_jwt(token: str) -> bool:
    return token.count(".") == 2


async def get_current_user(request: Request) -> str:
    # 1. Service token: MCP server authenticates via HMAC(CLERK_SECRET_KEY)
    svc_token = request.headers.get("X-Service-Token", "")
    if svc_token:
        settings = get_settings()
        if settings.clerk_secret_key and secrets.compare_digest(
            svc_token, _expected_service_token(settings.clerk_secret_key)
        ):
            user_id = await _get_clerk_owner_user_id(settings.clerk_secret_key)
            if user_id:
                return user_id
        raise HTTPException(status_code=401, detail="Invalid service token")

    # 2. Existing path: Clerk JWT or API key
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = auth[len("Bearer "):]
    if _looks_like_jwt(token):
        return await _verify_clerk_jwt(token)
    return await _verify_api_key(token)
