import json
import logging
from collections.abc import AsyncIterator, Mapping
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


class RedisEventBus:
    def __init__(self, redis: Redis) -> None:
        self._redis = redis

    async def publish(self, channel: str, event: Mapping[str, Any]) -> None:
        try:
            await self._redis.publish(channel, json.dumps(event, ensure_ascii=False, default=str))
        except RedisError:
            logger.warning("event bus unavailable, %s not published", channel, exc_info=True)

    async def subscribe(self, *channels: str) -> AsyncIterator[dict[str, Any]]:
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(*channels)
        try:
            async for message in pubsub.listen():
                if message.get("type") == "message":
                    yield json.loads(message["data"])
        finally:
            await pubsub.unsubscribe(*channels)
            await pubsub.aclose()  # type: ignore[no-untyped-call]
