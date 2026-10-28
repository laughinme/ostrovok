import hashlib
import json
from dataclasses import asdict
from typing import Literal

import httpx
from pydantic import BaseModel, Field, TypeAdapter, ValidationError
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.errors import RateLimitedError
from app.domain.geo.types import LonLat
from app.service.geo.places import GeocodingUnavailableError, Place


class NominatimPlace(BaseModel):
    osm_type: Literal["node", "way", "relation"]
    osm_id: int = Field(gt=0)
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False)
    display_name: str
    name: str = ""

    def place(self) -> Place:
        return Place(
            f"osm:{self.osm_type}/{self.osm_id}",
            self.name or self.display_name.split(",")[0],
            self.display_name,
            (self.lon, self.lat),
        )


class NominatimGeocoder:
    def __init__(self, redis: Redis, url: str, user_agent: str) -> None:
        self.redis, self.url, self.user_agent = redis, url, user_agent

    async def search(self, query: str, near: LonLat) -> list[Place]:
        normalized = " ".join(query.split())
        identity = json.dumps(
            [self.url, normalized.casefold(), round(near.lon, 2), round(near.lat, 2)]
        )
        key = "geocoding:search:" + hashlib.sha256(identity.encode()).hexdigest()
        try:
            cached = await self.redis.get(key)
            if cached:
                return TypeAdapter(list[Place]).validate_json(cached)
            if not await self.redis.set("geocoding:nominatim:rate", "1", nx=True, px=1100):
                raise RateLimitedError("Подождите секунду и повторите поиск адреса")
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(
                    self.url,
                    params={
                        "q": normalized,
                        "format": "jsonv2",
                        "limit": 5,
                        "accept-language": "ru",
                        "viewbox": ",".join(
                            str(value)
                            for value in (
                                near.lon - 0.6,
                                near.lat + 0.4,
                                near.lon + 0.6,
                                near.lat - 0.4,
                            )
                        ),
                    },
                    headers={"User-Agent": self.user_agent, "Accept": "application/json"},
                )
                response.raise_for_status()
                body = response.json()
                if not isinstance(body, list):
                    raise GeocodingUnavailableError()
                places = [NominatimPlace.model_validate(row).place() for row in body[:5]]
            await self.redis.set(key, json.dumps([asdict(place) for place in places]), ex=86400)
        except (httpx.HTTPError, RedisError, ValidationError, ValueError, TypeError) as error:
            raise GeocodingUnavailableError() from error
        return places
