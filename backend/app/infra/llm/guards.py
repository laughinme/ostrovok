"""Cost and failure guards around the LLM (D-26): a daily call limit and a circuit breaker."""

import logging
import time
from datetime import UTC, datetime

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.db.database import Database
from app.db.models import AppSetting

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """After a provider failure, skip the LLM for a while instead of waiting for a timeout."""

    def __init__(self, cooldown_sec: float = 60.0) -> None:
        self._cooldown = cooldown_sec
        self._open_until = 0.0

    @property
    def open(self) -> bool:
        return time.monotonic() < self._open_until

    def trip(self) -> None:
        self._open_until = time.monotonic() + self._cooldown
        logger.warning("LLM circuit open for %.0f s", self._cooldown)

    def reset(self) -> None:
        self._open_until = 0.0


class DailyLimit:
    """At most `limit` paid calls per UTC day across all processes (Redis counter)."""

    def __init__(self, redis: Redis | None, limit: int) -> None:
        self._redis = redis
        self._limit = limit
        self._local = 0

    async def take(self) -> bool:
        key = f"llm:calls:{datetime.now(UTC):%Y-%m-%d}"
        if self._redis is None:
            self._local += 1
            return self._local <= self._limit
        try:
            count = int(await self._redis.incr(key))
            await self._redis.expire(key, 2 * 24 * 3600)
        except RedisError:
            logger.warning("LLM limit counter unavailable, counting locally", exc_info=True)
            self._local += 1
            return self._local <= self._limit
        return count <= self._limit


class ModeSwitch:
    """The console's LLM on/off switch, read from the database at most every few seconds."""

    def __init__(self, db: Database, *, ttl_sec: float = 5.0) -> None:
        self._db = db
        self._ttl = ttl_sec
        self._checked = -1e9
        self._on = True

    async def on(self) -> bool:
        if time.monotonic() - self._checked > self._ttl:
            async with self._db.unit_of_work() as uow:
                row = await uow.session.get(AppSetting, "llm_mode")
            self._on = not (row is not None and row.value == "off")
            self._checked = time.monotonic()
        return self._on
