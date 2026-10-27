from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from app.domain.knowledge.confidence import ConfidenceLabel, label
from app.domain.knowledge.observation import Evidence
from app.domain.knowledge.scope import Scope
from app.domain.knowledge.sources import SourceKind


class FactStatus(StrEnum):
    OK = "ok"
    STALE = "stale"
    CONFLICT = "conflict"


@dataclass(frozen=True, slots=True)
class Fact:
    """What the system believes now for (hotel, characteristic, scope); built by the Reconciler."""

    hotel_id: UUID
    characteristic: str
    scope: Scope
    value: Any
    confidence: float
    statement: str
    scope_text: str
    source: SourceKind
    source_label: str
    method: str
    observed_at: datetime
    valid_until: datetime | None
    status: FactStatus = FactStatus.OK
    evidence: tuple[Evidence, ...] = ()
    caveats: tuple[str, ...] = ()
    observation_ids: tuple[UUID, ...] = ()
    conflict_id: UUID | None = None
    is_demo: bool = False
    version: int = 1
    id: UUID = field(default_factory=uuid4)

    @property
    def confidence_label(self) -> ConfidenceLabel:
        return label(self.confidence)


@dataclass(frozen=True, slots=True)
class FactChange:
    """One entry of a fact's history: «2 сентября: не уверены → 12 октября: скорее да»."""

    at: datetime
    statement: str
    confidence: float
    reason: str
    version: int
