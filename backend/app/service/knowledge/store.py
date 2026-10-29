from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from app.domain.knowledge.fact import Fact
from app.domain.knowledge.observation import Observation


@dataclass(frozen=True, slots=True)
class Recorded:
    changed_facts: tuple[Fact, ...]
    opened_conflicts: tuple[UUID, ...]


class KnowledgeWriter(Protocol):
    async def record(self, observations: Sequence[Observation], *, reason: str) -> Recorded: ...


class KnowledgeReader(Protocol):
    async def facts(
        self, hotel_id: UUID, *, characteristic: str | None = None
    ) -> Sequence[Fact]: ...
