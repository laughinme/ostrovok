from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import pytest

from app.db.models import FactRow
from app.domain.catalog import hotel_id
from app.service.quality.knowledge import gold_samples

NOW = datetime(2026, 10, 28, tzinfo=UTC)
LABEL = {
    "osm_id": "way/1",
    "characteristic": "sea_view",
    "facade": "SW",
    "floor": 4,
    "label": False,
    "annotated_by": "Участник команды",
    "sources": [{"url": "https://example.org"}],
}


def fact(**overrides: Any) -> FactRow:
    return FactRow(
        **{
            "id": uuid4(),
            "hotel_id": hotel_id("way/1"),
            "characteristic": "sea_view",
            "scope": {"facades": ["SW"], "floorFrom": 4, "floorTo": 8},
            "value": False,
            "confidence": 0.9,
            "status": "ok",
            "valid_until": None,
            **overrides,
        }
    )


def test_gold_matches_scope_and_converts_negative_statement_probability() -> None:
    samples, missing = gold_samples([fact()], [LABEL], NOW)
    assert samples["sea_view"][0][0] == pytest.approx(0.1)
    assert samples["sea_view"][0][1] is False
    assert missing == 0
    assert gold_samples([fact()], [{**LABEL, "facade": "N"}], NOW) == ({}, 1)
    assert gold_samples([fact()], [{**LABEL, "floor": None}], NOW) == ({}, 1)


def test_gold_rejects_expired_conflicting_and_ambiguous_facts() -> None:
    assert gold_samples([fact(valid_until=NOW - timedelta(days=1))], [LABEL], NOW) == ({}, 1)
    assert gold_samples([fact(status="conflict")], [LABEL], NOW) == ({}, 1)
    assert gold_samples([fact(), fact()], [LABEL], NOW) == ({}, 1)
    with pytest.raises(ValueError, match="annotated_by"):
        gold_samples([fact()], [{**LABEL, "sources": []}], NOW)
