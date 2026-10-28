from dataclasses import asdict
from typing import Any, Literal, Self
from uuid import UUID

from pydantic import ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

from app.api.schemas.base import ApiModel
from app.api.schemas.knowledge import FactOut
from app.domain.knowledge.scope import Facade, Scope
from app.service.partner.answers import AnswerResult
from app.service.partner.catalog import PartnerOverview
from app.service.partner.facades import FacadeMapping
from app.service.partner.questions import QuestionView


class QuestionOut(ApiModel):
    id: UUID
    hotel_id: UUID
    characteristic: str
    text: str
    why: str
    value: float
    answer_kind: Literal["facade_mapping", "choice", "number", "free_text"]
    options: tuple[str, ...]
    status: Literal["open", "answered"]

    @classmethod
    def from_domain(cls, question: QuestionView) -> Self:
        return cls(**asdict(question))


class ConflictOut(ApiModel):
    id: UUID
    hotel_id: UUID
    characteristic: str
    claims: list[dict[str, Any]]
    rule: str
    resolution: str
    status: str
    question_id: UUID | None


class CoverageOut(ApiModel):
    known: int
    total: int
    share: float


class PartnerOverviewOut(ApiModel):
    hotel_id: UUID
    name: str
    facts: list[FactOut]
    conflicts: list[ConflictOut]
    coverage: CoverageOut

    @classmethod
    def from_domain(cls, overview: PartnerOverview) -> Self:
        return cls(
            hotel_id=overview.hotel.geo.id,
            name=overview.hotel.geo.name,
            facts=[FactOut.from_domain(f) for f in overview.facts],
            conflicts=[ConflictOut(**asdict(c)) for c in overview.conflicts],
            coverage=CoverageOut(
                known=overview.known,
                total=overview.total,
                share=overview.known / overview.total if overview.total else 0,
            ),
        )


class FacadeMappingIn(ApiModel):
    model_config = ConfigDict(extra="forbid")
    room_type_id: str = Field(min_length=1, max_length=64)
    facade: Facade
    floor_from: int = Field(ge=1, strict=True)
    floor_to: int = Field(ge=1, strict=True)

    def to_domain(self) -> FacadeMapping:
        return FacadeMapping(self.room_type_id, self.facade, self.floor_from, self.floor_to)


class FacadesIn(ApiModel):
    model_config = ConfigDict(extra="forbid")
    mappings: list[FacadeMappingIn] = Field(min_length=1, max_length=300)


class AnswerIn(ApiModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(default="", max_length=4000)
    choice: str | None = Field(default=None, max_length=300)
    value: Any = None
    mappings: list[FacadeMappingIn] | None = Field(default=None, min_length=1, max_length=300)

    @model_validator(mode="after")
    def _one_answer(self) -> Self:
        count = sum((self.choice is not None, self.value is not None, self.mappings is not None))
        if count > 1 or (count == 0 and not self.text.strip()):
            raise ValueError("Provide text or one structured answer")
        return self

    def to_payload(self) -> dict[str, Any]:
        if self.mappings is not None:
            return {"mappings": [m.model_dump(mode="json", by_alias=True) for m in self.mappings]}
        if self.choice is not None:
            return {"choice": self.choice}
        return {"value": self.value} if self.value is not None else {}


class ScopeIn(ApiModel):
    model_config = ConfigDict(extra="forbid")
    facades: list[Facade] | None = Field(default=None, min_length=1)
    floor_from: int | None = Field(default=None, ge=1)
    floor_to: int | None = Field(default=None, ge=1)
    months: list[int] | None = Field(default=None, min_length=1)
    room_type_ids: list[str] | None = Field(default=None, min_length=1)

    def to_domain(self) -> Scope:
        return Scope(
            facades=frozenset(self.facades) if self.facades else None,
            floor_from=self.floor_from,
            floor_to=self.floor_to,
            months=frozenset(self.months) if self.months else None,
            room_types=frozenset(self.room_type_ids) if self.room_type_ids else None,
        )


class CorrectionIn(AnswerIn):
    scope: ScopeIn | None = None


class AnswerOut(ApiModel):
    answer_id: UUID
    parsed: dict[str, Any]
    parse_confidence: float
    parser: str
    changed_facts: list[FactOut]
    clarification: str | None

    @classmethod
    def from_domain(cls, result: AnswerResult) -> Self:
        return cls(
            answer_id=result.answer_id,
            parsed={to_camel(k): v for k, v in result.parsed.fields.items()},
            parse_confidence=result.parsed.confidence,
            parser=result.parsed.parser,
            changed_facts=[FactOut.from_domain(f) for f in result.changed],
            clarification=result.clarification,
        )


class ChangedFactsOut(ApiModel):
    changed_facts: list[FactOut]


class DecisionIn(ApiModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["confirmed", "alternative_offered", "declined"]
    reply: str = Field(min_length=1, max_length=4000)


class DemandItemOut(ApiModel):
    characteristic: str
    count: int


class DemandOut(ApiModel):
    hotel_id: UUID
    district: str
    days: Literal[7] = 7
    items: list[DemandItemOut]
