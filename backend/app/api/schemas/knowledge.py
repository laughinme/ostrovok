from datetime import datetime
from typing import Any, Literal, Self, TypedDict

from pydantic import Field, SerializerFunctionWrapHandler, model_serializer

from app.api.schemas.base import ApiModel
from app.domain.knowledge.characteristic import Characteristic, Checkable
from app.domain.knowledge.fact import Fact
from app.domain.knowledge.observation import Evidence, Observation
from app.domain.knowledge.scope import Facade, Scope
from app.domain.knowledge.sources import SourceKind, source_label
from app.service.knowledge.facts import FactDetail

ConfidenceLabel = Literal["точно", "скорее да", "не уверены", "скорее нет"]
EvidenceKind = Literal[
    "horizon_panorama", "noise_facades", "route_profile", "climate_chart",
    "hotelier_answer", "osm_objects", "map_layer", "text",
]  # fmt: skip


FacadeName = Literal["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


class ScopeJson(TypedDict, total=False):
    """ScopeOut on the wire: an absent field means «all»."""

    facades: list[FacadeName]
    floorFrom: int
    floorTo: int
    months: list[int]
    roomTypeIds: list[str]


class ScopeOut(ApiModel):
    facades: list[Facade] | None = None
    floor_from: int | None = None
    floor_to: int | None = None
    months: list[int] | None = None
    room_type_ids: list[str] | None = None

    # The explicit return type keeps the fields in OpenAPI; a bare dict exported `object`.
    @model_serializer(mode="wrap", return_type=ScopeJson)
    def _omit_all(self, handler: SerializerFunctionWrapHandler) -> dict[str, Any]:
        return {k: v for k, v in handler(self).items() if v is not None}

    @classmethod
    def from_domain(cls, scope: Scope) -> Self:
        return cls(
            facades=[f for f in Facade if f in scope.facades] if scope.facades else None,
            floor_from=scope.floor_from,
            floor_to=scope.floor_to,
            months=sorted(scope.months) if scope.months else None,
            room_type_ids=sorted(scope.room_types) if scope.room_types else None,
        )


class EvidenceOut(ApiModel):
    kind: EvidenceKind
    summary: str
    params: dict[str, Any] | None = None
    osm_refs: list[str] = Field(default_factory=list)
    attribution: str

    @classmethod
    def from_domain(cls, e: Evidence, *, compact: bool = False) -> Self:
        heavy = compact and e.kind.value == "map_layer"
        return cls(
            kind=e.kind.value,
            summary=e.summary,
            params=None if heavy else dict(e.params) or None,
            osm_refs=list(e.osm_refs),
            attribution=e.attribution,
        )


class FactOut(ApiModel):
    id: str
    hotel_id: str
    characteristic: str
    statement: str
    scope_text: str
    value: Any
    scope: ScopeOut
    confidence: float = Field(..., ge=0, le=1)
    confidence_label: ConfidenceLabel
    source: SourceKind
    source_label: str
    method: str
    observed_at: datetime
    valid_until: datetime | None = None
    status: Literal["ok", "stale", "conflict"]
    evidence: list[EvidenceOut]
    caveats: list[str]
    conflict_id: str | None = None
    is_demo: bool

    @classmethod
    def from_domain(cls, f: Fact, *, compact: bool = False) -> Self:
        return cls(
            id=str(f.id),
            hotel_id=str(f.hotel_id),
            characteristic=f.characteristic,
            statement=f.statement,
            scope_text=f.scope_text,
            value=f.value,
            scope=ScopeOut.from_domain(f.scope),
            confidence=round(f.confidence, 3),
            confidence_label=f.confidence_label.value,
            source=f.source,
            source_label=f.source_label,
            method=f.method,
            observed_at=f.observed_at,
            valid_until=f.valid_until,
            status=f.status.value,
            evidence=[EvidenceOut.from_domain(e, compact=compact) for e in f.evidence],
            caveats=list(f.caveats),
            conflict_id=str(f.conflict_id) if f.conflict_id else None,
            is_demo=f.is_demo,
        )


class FactSourceOut(ApiModel):
    kind: SourceKind
    label: str
    observed_at: datetime
    confidence: float
    ref: str | None = None
    statement: str | None = None

    @classmethod
    def from_domain(cls, o: Observation) -> Self:
        return cls(
            kind=o.source,
            label=source_label(
                o.source, observed_at=o.observed_at, is_demo=o.is_demo, ref=o.source_ref
            ),
            observed_at=o.observed_at,
            confidence=round(o.confidence, 3),
            ref=o.source_ref,
        )


class FactHistoryOut(ApiModel):
    at: datetime
    statement: str
    confidence: float
    reason: str


class FactDetailOut(FactOut):
    sources: list[FactSourceOut]
    history: list[FactHistoryOut]

    @classmethod
    def from_detail(cls, detail: FactDetail) -> Self:
        base = FactOut.from_domain(detail.fact).model_dump(by_alias=False)
        return cls(
            **base,
            sources=[FactSourceOut.from_domain(o) for o in detail.sources],
            history=[
                FactHistoryOut(
                    at=h.at, statement=h.statement, confidence=h.confidence, reason=h.reason
                )
                for h in detail.history
            ],
        )


class CharacteristicOut(ApiModel):
    key: str
    title: str
    how: str
    checkable: Checkable
    level: str
    method: str
    status: Literal["published", "provisional", "draft"]
    synonyms: list[str]
    ttl_days: int
    coverage: float | None = None
    avg_confidence: float | None = None

    @classmethod
    def from_domain(
        cls, c: Characteristic, *, coverage: float | None = None, avg: float | None = None
    ) -> Self:
        how = {
            Checkable.COMPUTE: "посчитаем",
            Checkable.ASK_HOTELIER: "спросим у отеля",
            Checkable.CANNOT: "проверить не можем",
        }[c.checkable]
        return cls(
            key=c.key,
            title=c.title,
            how=how,
            checkable=c.checkable,
            level=c.level.value,
            method=c.method.value,
            status=c.status.value,
            synonyms=list(c.synonyms),
            ttl_days=c.ttl_days,
            coverage=coverage,
            avg_confidence=avg,
        )
