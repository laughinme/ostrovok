from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from app.domain.knowledge.scope import Scope
from app.domain.knowledge.sources import SourceKind


class EvidenceKind(StrEnum):
    HORIZON_PANORAMA = "horizon_panorama"
    NOISE_FACADES = "noise_facades"
    ROUTE_PROFILE = "route_profile"
    CLIMATE_CHART = "climate_chart"
    HOTELIER_ANSWER = "hotelier_answer"
    OSM_OBJECTS = "osm_objects"
    MAP_LAYER = "map_layer"
    TEXT = "text"


OSM_ATTRIBUTION = "© OpenStreetMap contributors (ODbL)"
DEM_ATTRIBUTION = "Copernicus DEM GLO-30 © DLR, ESA"
CLIMATE_ATTRIBUTION = "Open-Meteo.com (CC BY 4.0)"


@dataclass(frozen=True, slots=True)
class Evidence:
    """How to check a claim yourself: a summary plus the parameters to rebuild the picture."""

    kind: EvidenceKind
    summary: str
    attribution: str
    params: Mapping[str, Any] = field(default_factory=dict)
    osm_refs: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class Observation:
    """
    Who claimed what (append-only). A newer observation from the same source and scope
    supersedes the older one but never deletes it.
    """

    hotel_id: UUID
    characteristic: str
    characteristic_version: int
    scope: Scope
    value: Any
    confidence: float
    source: SourceKind
    source_ref: str
    method: str
    observed_at: datetime
    valid_until: datetime | None = None
    evidence: tuple[Evidence, ...] = ()
    caveats: tuple[str, ...] = ()
    run_id: UUID | None = None
    is_demo: bool = False
    id: UUID = field(default_factory=uuid4)

    @property
    def source_key(self) -> tuple[SourceKind, str, str]:
        """Same source key + same scope → the newer observation supersedes the older one."""
        return self.source, self.source_ref.split("@")[0], self.scope.key
