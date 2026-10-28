"""
Ports to the outside world. Agents and services depend on these protocols; adapters live in
`app.infra` and are wired in `app.bootstrap`. Tests use fakes, so nothing here touches the network.
"""

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


# ── LLM ──────────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class Budget:
    """Per-run limits (09 §4.5); the adapter maps them onto PydanticAI `UsageLimits`."""

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
    """Input tokens the provider served from its prompt cache (billed cheaper)."""
    cost_usd: float = 0.0
    """Best-effort price from genai-prices; 0 for a cache hit or an unpriced model."""

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
    """
    For a cache hit (`cached`), `usage` and `latency_ms` are those of the call that produced
    the answer: nothing is spent now, but the evaluation still sees its price and speed.
    """

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
    """A tool the LLM may call: the same name, description and schema a developer sees."""

    name: str
    description: str
    args: type[BaseModel]
    call: Any  # async (args: BaseModel) -> BaseModel | Mapping


class LlmUnavailableError(Exception):
    """No key, provider error, timeout, broken schema or daily limit: callers fall back to rules."""


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


# ── Geo ──────────────────────────────────────────────────────────────────


class TerrainModel(Protocol):
    """Copernicus DEM as a numpy grid (no GDAL at runtime, D-11)."""

    def elevation(self, points: np.ndarray) -> np.ndarray:
        """Heights in metres for an (n, 2) array of lon, lat."""
        ...

    def far_horizon(
        self, origin: LonLat, eye_height_m: float, azimuths: np.ndarray, max_km: float = 40
    ) -> tuple[np.ndarray, np.ndarray]:
        """Terrain horizon elevation angle (degrees) and its distance (m) per azimuth."""
        ...


class AreaSlopes(Protocol):
    def within(self, origin: LonLat, radius_m: float) -> SlopeStat | None: ...


class Router(Protocol):
    """Pedestrian routing on our own graph (D-12); Valhalla could replace it behind this port."""

    def route(self, origin: LonLat, target: LonLat, profile: WalkProfile) -> Route | None: ...

    def nearest_of(
        self, origin: LonLat, targets: Sequence[LonLat], profile: WalkProfile
    ) -> tuple[int, Route] | None:
        """Index of the target with the shortest walk and the route to it."""
        ...

    def reachable(
        self,
        origin: LonLat,
        candidates: Sequence[tuple[str, str | None, LonLat]],
        minutes: float,
        profile: WalkProfile,
    ) -> list[Reachable]: ...


# ── Events ───────────────────────────────────────────────────────────────

EventType = Literal["run.step", "run.finished", "fact.changed", "search.updated", "notification"]


class EventBus(Protocol):
    """Wakes up SSE listeners; the database stays the source of truth (D-09)."""

    async def publish(self, channel: str, event: Mapping[str, Any]) -> None: ...

    def subscribe(self, *channels: str) -> AsyncIterator[dict[str, Any]]: ...


@dataclass(slots=True)
class RecordingEventBus:
    """In-memory bus for tests and for the CLI, where nobody listens."""

    published: list[tuple[str, dict[str, Any]]] = field(default_factory=list)

    async def publish(self, channel: str, event: Mapping[str, Any]) -> None:
        self.published.append((channel, dict(event)))

    async def subscribe(self, *channels: str) -> AsyncIterator[dict[str, Any]]:
        for channel, event in list(self.published):
            if channel in channels:
                yield event
