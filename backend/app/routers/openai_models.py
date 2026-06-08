from fastapi import APIRouter, Depends, HTTPException
from openai import AsyncOpenAI

from app.auth import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/openai", tags=["OpenAI"])

_CHAT_PREFIXES = ("gpt-", "o1", "o3", "o4", "chatgpt-")
_EXCLUSIONS = ("embed", "whisper", "tts", "realtime", "transcribe", "audio", "instruct")


def _is_chat_model(model_id: str) -> bool:
    return (
        any(model_id.startswith(p) for p in _CHAT_PREFIXES)
        and not any(e in model_id for e in _EXCLUSIONS)
    )


@router.get("/models", summary="List available OpenAI chat models")
async def list_openai_models(_: str = Depends(get_current_user)) -> dict:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.models.list()
    models = sorted(m.id for m in response.data if _is_chat_model(m.id))
    return {"models": models}
