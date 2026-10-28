from dataclasses import asdict
from typing import Self

from pydantic import Field

from app.api.schemas.base import ApiModel
from app.domain.search.taste import TasteProfile


class TasteWeightOut(ApiModel):
    characteristic: str
    weight: float
    because: str


class TasteProfileOut(ApiModel):
    enabled: bool
    summary: tuple[str, ...]
    weights: list[TasteWeightOut]

    @classmethod
    def from_domain(cls, profile: TasteProfile) -> Self:
        return cls(
            enabled=profile.enabled,
            summary=profile.summary,
            weights=[
                TasteWeightOut(**{k: v for k, v in asdict(w).items() if k != "value"})
                for w in profile.weights
            ],
        )


class TasteWeightIn(ApiModel):
    characteristic: str = Field(min_length=1, max_length=64)
    weight: float = Field(ge=0, le=3, allow_inf_nan=False)


class TastePatch(ApiModel):
    enabled: bool | None = None
    weights: list[TasteWeightIn] | None = Field(default=None, max_length=100)
