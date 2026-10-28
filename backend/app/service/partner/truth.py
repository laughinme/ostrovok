from collections.abc import Mapping
from typing import Any, Protocol


class HiddenTruth(Protocol):
    def profile(self, osm_id: str) -> Mapping[str, Any] | None: ...

    def claimed_hotels(self) -> tuple[str, ...]: ...
