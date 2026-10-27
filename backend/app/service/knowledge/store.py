"""The knowledge store seam (09 §5.3): agents write observations, readers get facts."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from app.domain.knowledge.fact import Fact
from app.domain.knowledge.observation import Observation


@dataclass(frozen=True, slots=True)
class Recorded:
    """What one `record` call changed: new fact versions and conflicts that opened."""

    changed_facts: tuple[Fact, ...]
    opened_conflicts: tuple[UUID, ...]


class KnowledgeWriter(Protocol):
    async def record(self, observations: Sequence[Observation], *, reason: str) -> Recorded:
        """Append observations, then reconcile each touched (hotel, characteristic) pair."""
        ...


class KnowledgeReader(Protocol):
    async def facts(
        self, hotel_id: UUID, *, characteristic: str | None = None
    ) -> Sequence[Fact]: ...
