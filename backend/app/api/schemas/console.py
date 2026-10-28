from datetime import datetime
from typing import Any, Literal, Self

from pydantic import Field

from app.api.schemas.base import ApiModel
from app.api.schemas.knowledge import CharacteristicOut
from app.db.models import ConflictRow, WorldChange
from app.service.console.registry import RegistryLine


class RegistryLineOut(CharacteristicOut):
    stale_share: float
    conflicts: int
    learned_from: str | None = None
    recipe: dict[str, Any]

    @classmethod
    def from_line(cls, line: RegistryLine) -> Self:
        c = line.characteristic
        base = CharacteristicOut.from_domain(
            c, coverage=line.coverage, avg=line.avg_confidence
        ).model_dump(by_alias=False)
        return cls(
            **base,
            stale_share=line.stale_share,
            conflicts=line.conflicts,
            learned_from=c.learned_from,
            recipe=dict(c.recipe),
        )


class LearnRequest(ApiModel):
    description: str = Field(
        ..., min_length=3, max_length=300, examples=["Хинкальная в 10 минутах"]
    )


class ConflictOut(ApiModel):
    id: str
    hotel_id: str
    characteristic: str
    claims: list[dict[str, Any]]
    rule: Literal["physics", "hotelier", "freshest", "guests"]
    resolution: str
    status: Literal["open", "resolved", "waiting_hotel"]
    cells: int
    question_id: str | None = None
    created_at: datetime

    @classmethod
    def from_row(cls, r: ConflictRow) -> Self:
        return cls(
            id=str(r.id),
            hotel_id=str(r.hotel_id),
            characteristic=r.characteristic,
            claims=r.claims,
            rule=r.rule,
            resolution=r.resolution,
            status=r.status,
            cells=r.cells,
            question_id=str(r.question_id) if r.question_id else None,
            created_at=r.created_at,
        )


class ResolveRequest(ApiModel):
    resolution: str = Field(..., min_length=2, max_length=500)


class WorldChangeOut(ApiModel):
    id: str
    kind: Literal["building_added", "building_removed", "construction", "poi_opened", "osm_diff"]
    title: str
    at: datetime
    affected_hotels: list[str]
    run_id: str | None = None
    reverted: bool = False

    @classmethod
    def from_row(cls, r: WorldChange) -> Self:
        return cls(
            id=str(r.id),
            kind=r.kind,
            title=r.title,
            at=r.created_at,
            affected_hotels=[str(h) for h in r.affected_hotels or []],
            run_id=str(r.run_id) if r.run_id else None,
            reverted=r.reverted_at is not None,
        )


class BuildingRequest(ApiModel):
    lon: float = Field(..., ge=39.0, le=41.0)
    lat: float = Field(..., ge=43.0, le=44.5)
    floors: int = Field(9, ge=1, le=40)
    width_m: float = Field(30, gt=3, le=200)
    depth_m: float = Field(15, gt=3, le=200)
    title: str | None = Field(None, max_length=200)


class WorldChangeStarted(ApiModel):
    change_id: str
    run_id: str


class SettingsModel(ApiModel):
    llm_mode: Literal["auto", "off"]
    llm_available: bool = False


class DemoResetOut(ApiModel):
    summary: str
