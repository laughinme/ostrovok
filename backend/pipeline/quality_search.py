"""Freeze fact-based relevance judgments. This is a regression set, not independent gold."""

import asyncio
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

import yaml
from sqlalchemy import select

from app.core.config import get_settings
from app.db.database import Database
from app.db.models import FactRow, Hotel
from app.domain.knowledge.scope import Cell, Facade, scope_from_json
from app.domain.knowledge.values import probability_of_yes
from app.service.quality.datasets import read_yaml

R2_CASES = (1, 2, 3, 5, 6, 7, 9, 10, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23, 25, 26)
AREAS = {
    1: "center",
    2: "center",
    3: "center",
    5: "center",
    6: "center",
    7: None,
    9: "khosta",
    10: "khosta",
    12: "khosta",
    13: "khosta",
    14: "khosta",
    15: "khosta",
    17: "adler",
    19: "adler",
    20: "adler",
    21: "adler",
    22: "adler",
    23: "adler",
    25: "sirius",
    26: "sirius",
}
THRESHOLD = 0.65
POOL_SIZE = 12


METHODOLOGY = {
    "label": "Оценки команды по фактам расчёта; автоматически по зафиксированной рубрике",
    "kind": "fact_based_regression",
    "independent_gold": False,
    "rubric": (
        "В одной точке фасад×этаж×месяц: 3=все условия, 2=не менее половины, 1=хотя "
        "бы одно, 0=нет подтверждения или превышен бюджет. P(да)≥0,65. Неизвестное "
        "не подтверждает условие."
    ),
    "pool": (
        "До 12 отелей с фактами по OSM ID в районе из R2. nDCG считается только "
        "внутри этого фиксированного пула; IDCG=0 исключается, количество исключений "
        "выводится."
    ),
    "limits": (
        "Без фотографий. Это согласованность выдачи с расчётами, не независимая "
        "оценка реальности. Не все оснащение и неизвестные пожелания подтверждены; "
        "метки не обновляются при eval."
    ),
    "reproduce": (
        "uv run python -m pipeline.quality_search (явно перезаписывает разметку текущими фактами)"
    ),
}


def _satisfies(fact: FactRow, chip: dict[str, Any]) -> bool:
    key, params, value = chip["key"], chip["params"], fact.value
    if isinstance(value, bool):
        p = probability_of_yes(value, fact.confidence)
        negative = key == "construction_nearby" or (key == "steep_streets" and params.get("avoid"))
        return (1 - p if negative else p) >= THRESHOLD
    if not isinstance(value, dict) or fact.confidence < THRESHOLD:
        return False
    if key in {"beach_walk", "stroller_to_sea"}:
        return (
            value.get("minutes") is not None
            and value["minutes"] <= params.get("max_walk_minutes", 15)
            and not (params.get("no_uphill") and value.get("back_climb_m", 0) > 15)
            and not (key == "stroller_to_sea" and value.get("steps", 0) > 0)
        )
    if key == "steep_streets":
        return value.get("share", 1) <= 0.2
    if key == "climate":
        return True  # The query asks for information, not a minimum temperature.
    return bool(value.get("allowed") or value.get("available"))


def _judge(hotel: Hotel, own: list[FactRow], case: dict[str, Any]) -> dict[str, Any]:
    chips = case["chips"]
    month = case["trip"].get("month") or int((case["trip"].get("from") or "2026-11-01")[5:7])
    floor_count = hotel.floors or 1
    best: list[dict[str, Any]] = []
    for facade in Facade:
        for floor in range(1, floor_count + 1):
            checked = []
            for chip in chips:
                matches = [
                    f
                    for f in own
                    if f.characteristic == chip["key"]
                    and scope_from_json(f.scope).contains(Cell(facade, floor, month))
                    and floor >= chip["params"].get("min_floor", 1)
                ]
                good = next((f for f in matches if _satisfies(f, chip)), None)
                checked.append(
                    {
                        "key": chip["key"],
                        "satisfied": good is not None,
                        "fact_id": str(good.id) if good else None,
                    }
                )
            if not best or sum(c["satisfied"] for c in checked) > sum(c["satisfied"] for c in best):
                best = checked
    fraction = sum(c["satisfied"] for c in best) / len(chips) if chips else 0
    grade = 3 if fraction == 1 else 2 if fraction >= 0.5 else 1 if fraction > 0 else 0
    budget = case["trip"].get("budget_per_night")
    if budget and hotel.price_from_demo and hotel.price_from_demo > budget:
        grade = 0
    return {"osm_id": hotel.osm_id, "grade": grade, "checks": best}


async def snapshot() -> None:
    settings = get_settings()
    db = Database(settings)
    try:
        async with db.unit_of_work() as uow:
            hotels = list(await uow.session.scalars(select(Hotel).order_by(Hotel.osm_id)))
            facts = list(await uow.session.scalars(select(FactRow).where(FactRow.status == "ok")))
        cases = await read_yaml(settings.data_dir / "eval/intents.yaml")
        data = _dataset(hotels, facts, cases)
        path = settings.data_dir / "eval/search_queries.yaml"
        await asyncio.to_thread(
            path.write_text,
            yaml.safe_dump(data, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )
        print(f"Frozen {len(data['queries'])} queries in {path}")
    finally:
        await db.dispose()


def _dataset(
    hotels: list[Hotel], facts: list[FactRow], cases: list[dict[str, Any]]
) -> dict[str, Any]:
    by_hotel: dict[Any, list[FactRow]] = defaultdict(list)
    for fact in facts:
        by_hotel[fact.hotel_id].append(fact)
    queries = []
    used: set[str] = set()
    for number in R2_CASES:
        case = cases[number - 1]
        pool = [
            h
            for h in hotels
            if (AREAS[number] is None or h.district == AREAS[number]) and by_hotel[h.id]
        ][:POOL_SIZE]
        judgments = [_judge(h, by_hotel[h.id], case) for h in pool]
        used.update(c["fact_id"] for j in judgments for c in j["checks"] if c["fact_id"])
        queries.append({"id": f"R2-{number:02}", "query": case["query"], "judgments": judgments})
    evidence = {
        str(f.id): {
            "osm_id": next(h.osm_id for h in hotels if h.id == f.hotel_id),
            "characteristic": f.characteristic,
            "scope": f.scope,
            "value": f.value,
            "confidence": f.confidence,
            "source": f.source,
            "is_demo": f.is_demo,
        }
        for f in facts
        if str(f.id) in used
    }
    return {
        "snapshot_at": datetime.now(UTC).isoformat(),
        "methodology": METHODOLOGY,
        "queries": queries,
        "evidence": evidence,
    }


if __name__ == "__main__":
    asyncio.run(snapshot())
