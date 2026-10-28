import json
from dataclasses import asdict
from unittest.mock import AsyncMock

import httpx
import pytest
from redis.asyncio import Redis

from app.core.errors import RateLimitedError
from app.domain.geo.types import LonLat
from app.infra.geo.geocoder import NominatimGeocoder
from app.service.geo.places import GeocodingUnavailableError, Place


async def test_search_identifies_app_biases_to_hotel_and_caches_response(monkeypatch) -> None:
    redis = AsyncMock(spec=Redis)
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock(return_value=True)
    calls = []
    real_client = httpx.AsyncClient

    def handler(request):
        calls.append(request)
        return httpx.Response(
            200,
            json=[
                {
                    "osm_type": "way",
                    "osm_id": 42,
                    "name": "Вокзал",
                    "display_name": "Вокзал, Сочи",
                    "lon": "39.72",
                    "lat": "43.58",
                }
            ],
        )

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs),
    )
    client = NominatimGeocoder(redis, "https://geo.test/search", "OknoTravel/test")
    found = await client.search("  Вокзал   Сочи ", LonLat(39.7, 43.6))
    assert found == [Place("osm:way/42", "Вокзал", "Вокзал, Сочи", (39.72, 43.58))]
    assert calls[0].headers["User-Agent"] == "OknoTravel/test"
    assert calls[0].url.params["q"] == "Вокзал Сочи"
    assert "viewbox" in calls[0].url.params
    assert redis.set.await_args_list[0].kwargs == {"nx": True, "px": 1100}
    redis.get.return_value = json.dumps([asdict(place) for place in found])
    assert await client.search("Вокзал Сочи", LonLat(39.7, 43.6)) == found
    assert len(calls) == 1


async def test_rate_limit_is_shared_across_uncached_queries() -> None:
    redis = AsyncMock(spec=Redis)
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock(return_value=False)
    with pytest.raises(RateLimitedError):
        await NominatimGeocoder(redis, "https://geo.test/search", "Okno").search(
            "Адрес", LonLat(39.7, 43.6)
        )


@pytest.mark.parametrize(
    "body",
    [{}, [{"osm_type": "way", "osm_id": 1, "lat": "nan", "lon": "39", "display_name": "Адрес"}]],
)
async def test_bad_upstream_results_become_recoverable_errors(monkeypatch, body) -> None:
    redis = AsyncMock(spec=Redis)
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock(return_value=True)
    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: real_client(
            transport=httpx.MockTransport(lambda _: httpx.Response(200, json=body)), **kwargs
        ),
    )
    with pytest.raises(GeocodingUnavailableError):
        await NominatimGeocoder(redis, "https://geo.test/search", "Okno").search(
            "Адрес", LonLat(39.7, 43.6)
        )
