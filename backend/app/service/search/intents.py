"""The Intent agent (09 §4.2): rules always, the LLM planner on top when it is available."""

from datetime import date
from functools import cache
from pathlib import Path

import yaml

from app.db.uow import UnitOfWork
from app.domain.search.intent import Intent, Vocabulary, parse_intent
from app.service.knowledge.registry import Registry


@cache
def _guest_phrases(data_dir: Path) -> dict[str, tuple[str, ...]]:
    path = data_dir / "registry" / "synonyms.yaml"
    if not path.exists():
        return {}
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))["synonyms"]
    return {key: tuple(entry.get("positive", ())) for key, entry in raw.items()}


class IntentParser:
    def __init__(self, uow: UnitOfWork, data_dir: Path) -> None:
        self._uow = uow
        self._data_dir = data_dir

    async def vocabulary(self) -> Vocabulary:
        registry = await Registry(self._uow).all()
        return Vocabulary.build(
            ((c.key, c.title, c.checkable, c.synonyms) for c in registry),
            _guest_phrases(self._data_dir),
        )

    async def parse(self, text: str, *, today: date) -> Intent:
        return parse_intent(text, await self.vocabulary(), today=today)
