from collections.abc import Mapping
from datetime import datetime
from enum import StrEnum


class SourceKind(StrEnum):
    COMPUTED = "computed"
    OPEN_DATA = "open_data"
    HOTELIER = "hotelier"
    GUEST = "guest"
    DEMO_CARD = "demo_card"


class Authority(StrEnum):
    """Who wins a conflict for a characteristic (09 §5.5)."""

    PHYSICS = "physics"
    HOTELIER = "hotelier"
    FRESHEST = "freshest"
    GUESTS = "guests"


# How much we trust each source kind under each rule, before per-hotel adjustments.
RELIABILITY: Mapping[Authority, Mapping[SourceKind, float]] = {
    Authority.PHYSICS: {
        SourceKind.COMPUTED: 1.0,
        SourceKind.OPEN_DATA: 0.8,
        SourceKind.HOTELIER: 0.35,
        SourceKind.GUEST: 0.6,
        SourceKind.DEMO_CARD: 0.2,
    },
    Authority.HOTELIER: {
        SourceKind.COMPUTED: 0.4,
        SourceKind.OPEN_DATA: 0.5,
        SourceKind.HOTELIER: 1.0,
        SourceKind.GUEST: 0.7,
        SourceKind.DEMO_CARD: 0.3,
    },
    Authority.FRESHEST: {
        SourceKind.COMPUTED: 0.8,
        SourceKind.OPEN_DATA: 0.8,
        SourceKind.HOTELIER: 0.9,
        SourceKind.GUEST: 0.8,
        SourceKind.DEMO_CARD: 0.3,
    },
    Authority.GUESTS: {
        SourceKind.COMPUTED: 0.6,
        SourceKind.OPEN_DATA: 0.6,
        SourceKind.HOTELIER: 0.6,
        SourceKind.GUEST: 1.0,
        SourceKind.DEMO_CARD: 0.2,
    },
}

DEMO_SOURCES = frozenset({SourceKind.DEMO_CARD})


def source_label(source: SourceKind, *, observed_at: datetime, is_demo: bool, ref: str = "") -> str:
    """«расчёт», «ответ отеля, 12.10», «демо-отельер» (08 §9 `Fact.sourceLabel`)."""
    if ref.startswith("open-meteo"):
        return "климат Open-Meteo"
    if source is SourceKind.HOTELIER:
        return "демо-отельер" if is_demo else f"ответ отеля, {observed_at:%d.%m}"
    return {
        SourceKind.COMPUTED: "расчёт",
        SourceKind.OPEN_DATA: "открытые данные OSM",
        SourceKind.GUEST: "отзывы гостей после поездки",
        SourceKind.DEMO_CARD: "демо-карточка",
    }[source]
