from pathlib import Path
from typing import Any

from app.db.uow import UnitOfWork
from app.domain.catalog import hotel_id
from app.domain.quality.metrics import ndcg_at_k, ratio
from app.domain.search.rank import Filters, rank
from app.domain.search.score import SearchHotel
from app.service.quality.datasets import read_yaml
from app.service.quality.parsing import EVAL_TODAY
from app.service.search.candidates import load_candidates, load_facts
from app.service.search.intents import IntentParser
from app.service.search.search import trip_window


async def search_metrics(uow: UnitOfWork, data_dir: Path) -> dict[str, Any]:
    dataset = await read_yaml(data_dir / "eval/search_queries.yaml")
    parser = IntentParser(uow, data_dir)
    hotels = await load_candidates(uow)
    rows = [await _query_metrics(uow, parser, hotels, case) for case in dataset["queries"]]
    scores = [r["ndcg10"] for r in rows if r["ndcg10"] is not None]
    return {
        "ndcg10": ratio(sum(scores), len(scores)),
        "n": len(rows),
        "evaluated": len(scores),
        "queries": rows,
        "methodology": dataset["methodology"],
        "snapshotAt": dataset["snapshot_at"],
        "informativeQueries": sum(r["distinctGrades"] > 1 for r in rows),
        "singletonQueries": sum(r["judged"] <= 1 for r in rows),
    }


async def _query_metrics(
    uow: UnitOfWork, parser: IntentParser, hotels: list[SearchHotel], case: dict[str, Any]
) -> dict[str, Any]:
    by_id = {h.id: h for h in hotels}
    intent = await parser.parse(case["query"], today=EVAL_TODAY)
    labels = {str(hotel_id(j["osm_id"])): j["grade"] for j in case["judgments"]}
    candidates = [h for h in hotels if str(h.id) in labels]
    missing = sum(hotel_id(j["osm_id"]) not in by_id for j in case["judgments"])
    facts = await load_facts(
        uow,
        [h.id for h in candidates],
        [c.characteristic for c in intent.chips if c.characteristic],
    )
    ranking = rank(
        intent.chips,
        candidates,
        facts,
        trip_window(intent),
        Filters(
            budget_per_night=intent.trip.budget_per_night,
            guests=(intent.trip.adults or 0) + (intent.trip.children or 0) or None,
        ),
    )
    score = ndcg_at_k([str(m.hotel.id) for m in ranking.matches], labels)
    if missing:
        score = None
    return {
        "id": case["id"],
        "ndcg10": score,
        "judged": len(labels),
        "distinctGrades": len(set(labels.values())),
        "missingHotels": missing,
        "returned": len(ranking.matches),
    }
