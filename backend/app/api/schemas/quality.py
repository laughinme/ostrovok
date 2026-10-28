from datetime import datetime
from typing import Any

from pydantic import Field

from app.api.schemas.base import ApiModel


class ReliabilityBin(ApiModel):
    from_: float = Field(alias="from")
    to: float
    n: int
    mean_probability: float | None
    positive_rate: float | None


class CharacteristicQuality(ApiModel):
    key: str
    n: int
    accuracy: float | None
    ece: float | None
    coverage: float | None
    current_coverage: float | None
    confident_coverage: float | None
    fact_count: int
    reliability: list[ReliabilityBin]


class QualityReport(ApiModel):
    generated_at: datetime
    per_characteristic: list[CharacteristicQuality]
    hotelier_share: float | None
    parse_accuracy: dict[str, float | None]
    ndcg10: float | None
    gold: dict[str, Any]
    knowledge: dict[str, Any]
    intents: dict[str, Any]
    hotelier_answers: dict[str, Any]
    curator: dict[str, Any]
    search: dict[str, Any]
    evaluation_date: str
    llm_status: str
