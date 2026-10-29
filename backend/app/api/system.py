import asyncio
import logging
from collections.abc import Awaitable
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.api.deps import DatabaseDep, RedisDep

logger = logging.getLogger(__name__)

router = APIRouter(tags=["System"])
health_router = APIRouter(tags=["System"])

_CHECK_TIMEOUT_SEC = 2.0


@health_router.get(
    path="/health", summary="Liveness: the process is up (never touches dependencies)"
)
async def health() -> dict[str, str]:
    return {"status": "ok"}


async def _check(name: str, probe: Awaitable[Any]) -> tuple[str, bool]:
    try:
        await asyncio.wait_for(probe, timeout=_CHECK_TIMEOUT_SEC)
    except Exception:
        logger.warning("readiness check %s failed", name, exc_info=True)
        return name, False
    return name, True


@router.get(
    path="/ready",
    summary="Readiness: Postgres and Redis answer",
    responses={503: {"description": "A dependency is down"}},
)
async def ready(db: DatabaseDep, redis: RedisDep) -> JSONResponse:
    results = await asyncio.gather(
        _check("database", db.ping()),
        _check("redis", redis.ping()),
    )
    checks = {name: "ok" if ok else "error" for name, ok in results}
    healthy = all(ok for _, ok in results)
    return JSONResponse(
        {"status": "ready" if healthy else "not_ready", "checks": checks},
        status_code=200 if healthy else 503,
    )
