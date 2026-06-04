from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import get_settings
from app.logging import get_logger

log = get_logger(__name__)
_client: AsyncIOMotorClient | None = None


def get_database() -> AsyncIOMotorDatabase:
    if _client is None:
        raise RuntimeError("MongoDB client is not initialized. Was lifespan called?")
    return _client[get_settings().mongo_db]


async def connect_to_mongo() -> None:
    global _client
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongo_uri)
    async for attempt in AsyncRetrying(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
        reraise=True,
    ):
        with attempt:
            await _client.admin.command("ping")
    log.info("mongo.connected", db=settings.mongo_db)


def close_mongo_connection() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
        log.info("mongo.closed")


async def ping() -> None:
    if _client is None:
        raise RuntimeError("MongoDB client not initialized")
    await _client.admin.command("ping")


async def create_indexes() -> None:
    """Idempotent — Motor's create_index is a no-op when the index already exists."""
    db = get_database()
    await db["workouts"].create_index([("user_id", 1), ("date", -1)])
    await db["exercises"].create_index([("user_id", 1), ("name", 1)])
    await db["api_keys"].create_index("key_hash", unique=True)
    log.info("mongo.indexes_ready")
