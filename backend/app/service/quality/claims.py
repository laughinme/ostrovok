"""
What hotels say on their own sites (R7, `data/eval/official_claims.yaml`) against our facts.
Sites rarely name a facade or floor, so the check is per hotel: a hotel that advertises a sea view
should have at least one window where we find one; a stated distance to the beach should be close
to our walking route. An independent check, not a calibration: there are no negative view labels.
"""

import re
from collections.abc import Mapping, Sequence
from datetime import datetime
from pathlib import Path
from statistics import median
from typing import Any

from sqlalchemy import select

from app.db.models import FactRow
from app.db.repositories.catalog import hotel_geo
from app.db.uow import UnitOfWork
from app.domain.catalog import hotel_id, nearby_places
from app.domain.knowledge.values import probability_of_yes
from app.domain.quality.metrics import ratio
from app.service.quality.datasets import read_yaml

VIEWS = ("sea_view", "mountain_view")
YES = "да"
_METRES = re.compile(r"(\d+)\s*м\b")
_MINUTES = re.compile(r"(\d+)(?:\s*[–-]\s*(\d+))?\s*мин")
# Sites round generously: «100 м» may be 50 or 200 by the map
_SPREAD = (0.5, 2.0)
_CLOSE_M = 150
_CLOSE_MIN = 5
_BEACH_SEARCH_M = 3000


def claimed_distance(claim: Mapping[str, Any]) -> tuple[str, float] | None:
    """«300 м» → ("metres", 300); «15–20 минут пешком» → ("minutes", 17.5); a transfer → None."""
    value = claim.get("value")
    if not isinstance(value, str) or "трансфер" in str(claim.get("claim", "")).lower():
        return None
    if found := _MINUTES.search(value):
        low = float(found.group(1))
        return "minutes", (low + float(found.group(2) or low)) / 2
    if found := _METRES.search(value):
        return "metres", float(found.group(1))
    return None


def distance_agrees(kind: str, claimed: float, minutes: float, straight_m: float | None) -> bool:
    """Minutes against our walking route; metres («до моря 100 м») against the straight line."""
    if kind == "minutes":
        return abs(minutes - claimed) <= max(_CLOSE_MIN, claimed / 2)
    if straight_m is None:
        return False
    low, high = _SPREAD
    return abs(straight_m - claimed) <= _CLOSE_M or low <= straight_m / claimed <= high


def _current(facts: Sequence[FactRow], now: datetime) -> list[FactRow]:
    return [f for f in facts if f.status == "ok" and (f.valid_until is None or f.valid_until > now)]


async def claims_metrics(uow: UnitOfWork, path: Path, now: datetime) -> dict[str, Any]:
    try:
        hotels: Mapping[str, Any] = await read_yaml(path)
    except FileNotFoundError:
        return {"status": "нет данных", "hotels": 0}
    ids = {hotel_id(osm): osm for osm in hotels}
    rows = await uow.session.scalars(
        select(FactRow).where(
            FactRow.hotel_id.in_(ids), FactRow.characteristic.in_([*VIEWS, "beach_walk"])
        )
    )
    facts: dict[tuple[str, str], list[FactRow]] = {}
    for fact in _current(list(rows), now):
        facts.setdefault((ids[fact.hotel_id], fact.characteristic), []).append(fact)

    views: list[dict[str, Any]] = []
    beach: list[dict[str, Any]] = []
    for osm, hotel in hotels.items():
        claims = hotel.get("claims") or []
        for key in VIEWS:
            claim = next((c for c in claims if c["topic"] == key and c["value"] == YES), None)
            if claim is not None:
                views.append(_view(osm, hotel["name"], key, claim, facts.get((osm, key), [])))
        route = next(
            (f.value for f in facts.get((osm, "beach_walk"), []) if isinstance(f.value, dict)),
            None,
        )
        stated = [
            (claim, distance)
            for claim in claims
            if claim["topic"] == "beach" and (distance := claimed_distance(claim))
        ]
        straight = await _straight_to_beach(uow, osm) if stated else None
        beach.extend(
            _beach(osm, hotel["name"], claim, distance, route, straight)
            for claim, distance in stated
        )
    return {
        "status": "R7: официальные сайты, 28.10.2026",
        "hotels": len(hotels),
        "hotelsWithClaims": sum(bool(h.get("claims")) for h in hotels.values()),
        "views": _summary(views),
        "beach": {
            **_summary(beach),
            "medianStraightToClaimedMetres": _median_ratio(beach),
        },
    }


def _view(
    osm: str, name: str, key: str, claim: Mapping[str, Any], facts: Sequence[FactRow]
) -> dict[str, Any]:
    chances = [
        probability_of_yes(f.value, f.confidence) for f in facts if isinstance(f.value, bool)
    ]
    best = max(chances, default=None)
    return {
        "osmId": osm,
        "name": name,
        "characteristic": key,
        "claim": claim["claim"],
        "url": claim["url"],
        "bestProbability": None if best is None else round(best, 3),
        "agrees": None if best is None else best >= 0.5,  # noqa: PLR2004 - P(да) above a coin
    }


async def _straight_to_beach(uow: UnitOfWork, osm: str) -> float | None:
    row = await uow.catalog.hotel(hotel_id(osm))
    if row is None:
        return None
    here = hotel_geo(row).location
    beaches = await uow.catalog.features_near(here, _BEACH_SEARCH_M, kinds=["beach"])
    nearest = next((p for p in nearby_places(here, beaches) if p.kind == "beach"), None)
    return None if nearest is None else round(nearest.distance_m)


def _beach(  # noqa: PLR0917 - one claim with both of our measurements
    osm: str,
    name: str,
    claim: Mapping[str, Any],
    stated: tuple[str, float],
    route: Mapping[str, Any] | None,
    straight_m: float | None,
) -> dict[str, Any]:
    kind, value = stated
    item: dict[str, Any] = {
        "osmId": osm,
        "name": name,
        "claim": claim["claim"],
        "url": claim["url"],
        "claimed": {kind: value},
        "straightM": straight_m,
        "route": None,
        "agrees": None,
    }
    if route is not None:
        minutes, length = float(route["minutes"]), float(route["length_m"])
        item["route"] = {"minutes": minutes, "lengthM": length, "target": route.get("target")}
    if kind == "minutes" and route is not None:
        item["agrees"] = distance_agrees(kind, value, item["route"]["minutes"], straight_m)
    elif kind == "metres" and straight_m is not None:
        item["agrees"] = distance_agrees(kind, value, 0, straight_m)
    return item


def _summary(items: list[dict[str, Any]]) -> dict[str, Any]:
    checked = [i for i in items if i["agrees"] is not None]
    agree = sum(bool(i["agrees"]) for i in checked)
    return {
        "claims": len(items),
        "checked": len(checked),
        "agree": agree,
        "agreement": ratio(agree, len(checked)),
        "items": items,
    }


def _median_ratio(items: list[dict[str, Any]]) -> float | None:
    """How many times farther the nearest mapped beach is than the metres a site quotes."""
    ratios = [
        i["straightM"] / i["claimed"]["metres"]
        for i in items
        if i["straightM"] is not None and "metres" in i["claimed"]
    ]
    return round(median(ratios), 2) if ratios else None
