from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import select

from app.db.models import FactRow, Hotel, ObservationRow
from app.db.uow import UnitOfWork
from app.domain.catalog import hotel_id
from app.domain.knowledge.scope import scope_from_json
from app.domain.knowledge.values import probability_of_yes
from app.domain.quality.metrics import calibration, ratio
from app.service.knowledge.registry import Registry
from app.service.quality.datasets import read_yaml

CONFIDENT = 0.85


def _covers(fact: FactRow, label: Mapping[str, Any]) -> bool:
    scope = scope_from_json(fact.scope)
    if scope.room_types and label.get("room_type") not in scope.room_types:
        return False
    for key, values in (("facade", scope.facades), ("month", scope.months)):
        if values is not None and label.get(key) not in values:
            return False
    floor = label.get("floor")
    if scope.floor_from is not None and (floor is None or floor < scope.floor_from):
        return False
    return not (scope.floor_to is not None and (floor is None or floor > scope.floor_to))


def gold_samples(
    facts: Sequence[FactRow], labels: Sequence[Mapping[str, Any]], now: datetime
) -> tuple[dict[str, list[tuple[float, bool]]], int]:
    index: dict[tuple[UUID, str], list[FactRow]] = defaultdict(list)
    for fact in facts:
        if (
            isinstance(fact.value, bool)
            and fact.status == "ok"
            and (fact.valid_until is None or fact.valid_until > now)
        ):
            index[fact.hotel_id, fact.characteristic].append(fact)
    samples: dict[str, list[tuple[float, bool]]] = defaultdict(list)
    unmatched = 0
    for label in labels:
        if (
            not isinstance(label.get("label"), bool)
            or not label.get("annotated_by")
            or not label.get("sources")
        ):
            raise ValueError("Gold labels require boolean label, annotated_by and open sources")
        key = str(label["characteristic"])
        matching = [f for f in index[hotel_id(label["osm_id"]), key] if _covers(f, label)]
        if len(matching) != 1:
            unmatched += 1
            continue
        fact = matching[0]
        samples[key].append((probability_of_yes(fact.value, fact.confidence), label["label"]))
    return dict(samples), unmatched


async def knowledge_metrics(uow: UnitOfWork, path: Path, now: datetime) -> dict[str, Any]:
    facts = list(await uow.session.scalars(select(FactRow)))
    hotels = list(await uow.session.scalars(select(Hotel.id)))
    try:
        labels = (await read_yaml(path)).get("labels", [])
    except FileNotFoundError:
        labels = []
    samples, unmatched = gold_samples(facts, labels, now)
    hotelier = set(
        await uow.session.scalars(
            select(ObservationRow.id).where(ObservationRow.source == "hotelier")
        )
    )
    keys = [c.key for c in await Registry(uow).all()]
    per_characteristic = [
        _characteristic(key, facts, len(hotels), samples.get(key, []), now) for key in keys
    ]
    return {
        "perCharacteristic": per_characteristic,
        "hotelierShare": ratio(
            sum(
                f.source == "hotelier" or bool(hotelier.intersection(f.observation_ids))
                for f in facts
            ),
            len(facts),
        ),
        "knowledge": {
            "hotels": len(hotels),
            "facts": len(facts),
            "confidenceHistogram": _histogram(facts),
            "demoFacts": sum(f.is_demo for f in facts),
        },
        "gold": {
            "status": "размечен" if labels else "эталон не размечен",
            "labels": len(labels),
            "matched": sum(len(s) for s in samples.values()),
            "unmatched": unmatched,
        },
    }


def _histogram(facts: Sequence[FactRow]) -> list[dict[str, int | float]]:
    counts = Counter(min(int(f.confidence * 10), 9) for f in facts)
    return [{"from": i / 10, "to": (i + 1) / 10, "n": counts[i]} for i in range(10)]


def _characteristic(
    key: str,
    facts: Sequence[FactRow],
    hotels: int,
    samples: Sequence[tuple[float, bool]],
    now: datetime,
) -> dict[str, Any]:
    own = [f for f in facts if f.characteristic == key]
    current = [
        f for f in own if f.status == "ok" and (f.valid_until is None or f.valid_until > now)
    ]
    return {
        "key": key,
        **calibration(samples),
        "factCount": len(own),
        "coverage": ratio(len({f.hotel_id for f in own}), hotels),
        "currentCoverage": ratio(len({f.hotel_id for f in current}), hotels),
        "confidentCoverage": ratio(
            len({f.hotel_id for f in current if f.confidence >= CONFIDENT}), hotels
        ),
    }
