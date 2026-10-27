from dataclasses import dataclass
from functools import cache
from pathlib import Path

import yaml

from app.domain.users import Role


@dataclass(frozen=True, slots=True)
class Persona:
    key: str
    role: Role
    name: str
    title: str
    hotels: tuple[str, ...]


@cache
def load_personas(data_dir: Path) -> tuple[Persona, ...]:
    path = data_dir / "demo" / "users.yaml"
    if not path.exists():
        return ()
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return tuple(
        Persona(
            key=p["key"],
            role=Role(p["role"]),
            name=p["name"],
            title=p.get("title", ""),
            hotels=tuple(p.get("hotels", [])),
        )
        for p in raw["personas"]
    )
