import time
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.database import (
    close_mongo_connection,
    connect_to_mongo,
    create_indexes,
    ping,
)
from app.logging import configure_logging, get_logger
from app.routers.admin import router as admin_router
from app.routers.api_keys import router as api_keys_router
from app.routers.auth import router as auth_router
from app.routers.exercises import router as exercises_router
from app.routers.generate import router as generate_router
from app.routers.openai_models import router as openai_models_router
from app.routers.profile import router as profile_router
from app.routers.workouts import router as workouts_router

configure_logging()
log = get_logger(__name__)
settings = get_settings()

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit_default])


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("app.starting", environment=settings.environment)
    await connect_to_mongo()
    await create_indexes()
    log.info("app.ready")
    yield
    close_mongo_connection()
    log.info("app.stopped")


app = FastAPI(title="Kinetic API", lifespan=lifespan)
app.state.limiter = limiter


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            log.exception("request.unhandled_error")
            raise
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        log.info(
            "request.complete",
            status=response.status_code,
            duration_ms=elapsed_ms,
        )
        response.headers["x-request-id"] = request_id
        return response


app.add_middleware(RequestContextMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    request_id = structlog.contextvars.get_contextvars().get("request_id")
    log.warning("rate_limit.exceeded", limit=str(exc.detail))
    return JSONResponse(
        status_code=429,
        content={"error": "Rate limit exceeded", "detail": str(exc.detail), "request_id": request_id},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = structlog.contextvars.get_contextvars().get("request_id")
    log.exception("unhandled_exception")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "request_id": request_id},
    )


app.include_router(exercises_router)
app.include_router(workouts_router)
app.include_router(admin_router)
app.include_router(profile_router)
app.include_router(api_keys_router)
app.include_router(generate_router)
app.include_router(openai_models_router)
app.include_router(auth_router)


@app.get("/health", tags=["Health"])
async def liveness() -> dict:
    return {"status": "ok"}


@app.get("/health/ready", tags=["Health"])
async def readiness() -> JSONResponse:
    try:
        await ping()
        return JSONResponse({"status": "ok", "database": "connected"})
    except Exception as exc:
        log.warning("readiness.database_unreachable", error=str(exc))
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "unreachable"},
        )
