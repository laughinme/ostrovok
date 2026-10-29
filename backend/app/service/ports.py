from collections.abc import AsyncIterator, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal, Protocol

import numpy as np
from pydantic import BaseModel

from app.domain.geo.slopes import SlopeStat
from app.domain.geo.types import LonLat, Reachable, Route, WalkProfile


class Clock(Protocol):
    def now(self) -> datetime: ...


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)


@dataclass(frozen=True, slots=True)
class Budget:
    max_requests: int = 8
    max_tool_calls: int = 8
    max_seconds: float = 20.0
    max_output_tokens: int = 4000


@dataclass(frozen=True, slots=True)
class Usage:
    requests: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0
    cost_usd: float = 0.0

    def __add__(self, other: "Usage") -> "Usage":
        return Usage(
            self.requests + other.requests,
            self.input_tokens + other.input_tokens,
            self.output_tokens + other.output_tokens,
            self.cached_tokens + other.cached_tokens,
            self.cost_usd + other.cost_usd,
        )


@dataclass(frozen=True, slots=True)
class LlmResult[T]:
    output: T
    usage: Usage
    model: str
    cached: bool = False
    latency_ms: int = 0

    @property
    def spent(self) -> Usage:
        return Usage() if self.cached else self.usage


@dataclass(frozen=True, slots=True)
class ToolSpec:
    name: str
    description: str
    args: type[BaseModel]
    call: Any


class LlmUnavailableError(Exception):
    pass


class LanguageModel(Protocol):
    @property
    def available(self) -> bool: ...

    async def structured[T: BaseModel](
        self, *, task: str, system: str, prompt: str, output: type[T]
    ) -> LlmResult[T]: ...

    async def run_tools[T: BaseModel](
        self,
        *,
        task: str,
        system: str,
        prompt: str,
        tools: Sequence[ToolSpec],
        output: type[T],
        budget: Budget,
    ) -> LlmResult[T]: ...


class VisionLanguageModel(Protocol):
    @property
    def available(self) -> bool: ...

    async def structured_image[T: BaseModel](
        self, *, task: str, system: str, prompt: str, image: bytes, media_type: str, output: type[T]
    ) -> LlmResult[T]: ...


class TerrainModel(Protocol):
    def elevation(self, points: np.ndarray) -> np.ndarray: ...

    def far_horizon(
        self, origin: LonLat, eye_height_m: float, azimuths: np.ndarray, max_km: float = 40
    ) -> tuple[np.ndarray, np.ndarray]: ...


class AreaSlopes(Protocol):
    def within(self, origin: LonLat, radius_m: float) -> SlopeStat | None: ...


class Router(Protocol):
    def route(self, origin: LonLat, target: LonLat, profile: WalkProfile) -> Route | None: ...

    def nearest_of(
        self, origin: LonLat, targets: Sequence[LonLat], profile: WalkProfile
    ) -> tuple[int, Route] | None: ...

    def reachable(
        self,
        origin: LonLat,
        candidates: Sequence[tuple[str, str | None, LonLat]],
        minutes: float,
        profile: WalkProfile,
    ) -> list[Reachable]: ...


EventType = Literal["run.step", "run.finished", "fact.changed", "search.updated", "notification"]


class EventBus(Protocol):
    async def publish(self, channel: str, event: Mapping[str, Any]) -> None: ...

    def subscribe(self, *channels: str) -> AsyncIterator[dict[str, Any]]: ...


@dataclass(slots=True)
class RecordingEventBus:
    published: list[tuple[str, dict[str, Any]]] = field(default_factory=list)

    async def publish(self, channel: str, event: Mapping[str, Any]) -> None:
        self.published.append((channel, dict(event)))

    async def subscribe(self, *channels: str) -> AsyncIterator[dict[str, Any]]:
        for channel, event in list(self.published):
            if channel in channels:
                yield event
