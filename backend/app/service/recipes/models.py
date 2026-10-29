from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.knowledge.tags import keys_of, tags_match

ClimateMetric = Literal["air_max", "air_min", "water", "sun_hours", "rain_days", "daylight_h"]
NoiseSource = Literal["road", "railway", "bar_club", "construction", "aircraft"]


def _all_noise_sources() -> list[NoiseSource]:
    return ["road", "railway", "bar_club", "construction", "aircraft"]


class _Recipe(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class TagFilter(_Recipe):
    """
    OSM tag filter: any `tags` pair matches ({"amenity": ["pharmacy"]}), or any alternative in
    `any_of` with all its pairs ({"amenity": ["restaurant"], "cuisine": ["georgian"]});
    ["*"] means "the tag is present". Name filters narrow the result.
    """

    tags: dict[str, list[str]] = Field(default_factory=dict)
    any_of: list[dict[str, list[str]]] = Field(default_factory=list, max_length=10)
    name_contains: list[str] = Field(default_factory=list)
    name_regex: str | None = Field(None, max_length=200)

    @model_validator(mode="after")
    def _something_to_match(self) -> "TagFilter":
        if not self.tags and not self.any_of:
            raise ValueError("set tags or any_of")
        return self

    def matches(self, tags: dict[str, str]) -> bool:
        return tags_match(
            tags,
            any_tag=self.tags,
            any_of=self.any_of,
            name_contains=self.name_contains,
            name_regex=self.name_regex,
        )

    @property
    def keys(self) -> list[str]:
        return keys_of(self.tags, self.any_of)


class ViewRecipe(_Recipe):
    kind: Literal["view"] = "view"
    target: Literal["sea", "mountains"]
    min_share: float = Field(0.05, ge=0, le=1, description="Share of the field of view to count")


class SunEventRecipe(_Recipe):
    kind: Literal["sun_event"] = "sun_event"
    event: Literal["sunset", "sunrise"]
    over: Literal["sea", "any"] = "sea"


class NoiseRecipe(_Recipe):
    kind: Literal["noise"] = "noise"
    period: Literal["day", "night"]
    sources: list[NoiseSource] = Field(default_factory=_all_noise_sources)
    quiet_below_db: float = Field(45, ge=20, le=80)


class WalkToRecipe(_Recipe):
    kind: Literal["walk_to"] = "walk_to"
    target: Literal["beach", "center", "station"] | TagFilter
    profile: Literal["walk", "stroller", "wheelchair"] = "walk"
    max_minutes: float | None = Field(None, gt=0, le=60)
    max_climb_m: float | None = Field(None, ge=0, le=300)
    no_steps: bool = False


class PoiNearbyRecipe(_Recipe):
    kind: Literal["poi_nearby"] = "poi_nearby"
    poi: TagFilter
    within_minutes: float | None = Field(None, gt=0, le=40)
    within_m: float | None = Field(None, gt=0, le=5000)
    open: Literal["any", "night", "24_7", "morning"] = "any"
    min_count: int = Field(1, ge=1, le=20)

    @model_validator(mode="after")
    def _one_radius(self) -> "PoiNearbyRecipe":
        if (self.within_minutes is None) == (self.within_m is None):
            raise ValueError("set exactly one of within_minutes and within_m")
        return self


class AreaStatRecipe(_Recipe):
    kind: Literal["area_stat"] = "area_stat"
    metric: Literal["steep_share", "green_share"]
    radius_m: float = Field(300, gt=0, le=2000)
    threshold: float = Field(0.25, ge=0, le=1)


class ClimateRecipe(_Recipe):
    kind: Literal["climate"] = "climate"
    metric: (
        Literal["air_max", "air_min", "water", "sun_hours", "rain_days", "daylight_h"] | None
    ) = None


class AskHotelierRecipe(_Recipe):
    kind: Literal["ask_hotelier"] = "ask_hotelier"
    question: str = Field(min_length=5, max_length=300)
    answer_kind: Literal["facade_mapping", "choice", "number", "free_text", "yes_no"]
    options: list[str] = Field(default_factory=list)
    unit: str | None = None


class DerivedRecipe(_Recipe):
    kind: Literal["derived"] = "derived"
    op: Literal["all", "any", "not"]
    keys: list[str] = Field(min_length=1, max_length=5)


Recipe = Annotated[
    ViewRecipe
    | SunEventRecipe
    | NoiseRecipe
    | WalkToRecipe
    | PoiNearbyRecipe
    | AreaStatRecipe
    | ClimateRecipe
    | AskHotelierRecipe
    | DerivedRecipe,
    Field(discriminator="kind"),
]
