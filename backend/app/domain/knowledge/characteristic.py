from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from app.domain.knowledge.sources import Authority
from app.domain.knowledge.values import ValueType


class Level(StrEnum):
    """Where a characteristic's value lives (08 §9 `Characteristic.level`)."""

    HOTEL = "hotel"
    FACADE = "facade"
    FACADE_FLOOR = "facade_floor"
    FACADE_FLOOR_MONTH = "facade_floor_month"
    MONTH = "month"
    ROOM_TYPE = "room_type"


class MethodKind(StrEnum):
    """The closed set of methods (09 §5.2). A new method is code; a new characteristic is data."""

    VIEW = "view"
    SUN_EVENT = "sun_event"
    NOISE = "noise"
    WALK_TO = "walk_to"
    POI_NEARBY = "poi_nearby"
    AREA_STAT = "area_stat"
    CLIMATE = "climate"
    ASK_HOTELIER = "ask_hotelier"
    DERIVED = "derived"


class Checkable(StrEnum):
    COMPUTE = "compute"
    ASK_HOTELIER = "ask_hotelier"
    CANNOT = "cannot"


class CharacteristicStatus(StrEnum):
    PUBLISHED = "published"
    PROVISIONAL = "provisional"
    DRAFT = "draft"


@dataclass(frozen=True, slots=True)
class Characteristic:
    """A registry entry: what the system can know and how to get it (09 §5.1)."""

    key: str
    title: str
    level: Level
    value_type: ValueType
    method: MethodKind
    recipe: Mapping[str, Any]
    ttl_days: int
    authority: Authority
    statement: str
    version: int = 1
    status: CharacteristicStatus = CharacteristicStatus.PUBLISHED
    synonyms: tuple[str, ...] = ()
    question: str | None = None
    unit: str | None = None
    learned_from: str | None = None
    extra: Mapping[str, Any] = field(default_factory=dict)

    @property
    def checkable(self) -> Checkable:
        return (
            Checkable.ASK_HOTELIER if self.method is MethodKind.ASK_HOTELIER else Checkable.COMPUTE
        )

    @property
    def gridded(self) -> bool:
        """Facts of facade-level characteristics are reconciled cell by cell over the hotel grid."""
        return self.level in {Level.FACADE, Level.FACADE_FLOOR, Level.FACADE_FLOOR_MONTH}
