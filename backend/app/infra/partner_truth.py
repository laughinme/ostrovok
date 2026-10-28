from collections.abc import Mapping
from pathlib import Path
from typing import Any

import yaml


class YamlHiddenTruth:
    def __init__(self, path: Path) -> None:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) if path.exists() else {}
        self._hotels: dict[str, dict[str, Any]] = raw.get("hotels", {})

    def profile(self, osm_id: str) -> Mapping[str, Any] | None:
        return self._hotels.get(osm_id)

    def claimed_hotels(self) -> tuple[str, ...]:
        return tuple(
            key
            for key, value in self._hotels.items()
            if value.get("claims", {}).get("sea_view_all_rooms")
        )
