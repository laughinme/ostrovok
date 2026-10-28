"""The Intent agent (09 §4.2): the LLM planner when available, rules otherwise — same `Intent`."""

from datetime import date
from functools import cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field

from app.db.uow import UnitOfWork
from app.domain.knowledge.characteristic import Characteristic, Checkable
from app.domain.search.intent import Chip, Importance, Intent, Vocabulary, parse_intent
from app.domain.search.trip import TripDraft
from app.service.agents.fallback import with_fallback
from app.service.knowledge.registry import Registry
from app.service.ports import LanguageModel

PROMPTS = Path(__file__).resolve().parents[1] / "agents" / "prompts"


@cache
def _guest_phrases(data_dir: Path) -> dict[str, tuple[str, ...]]:
    path = data_dir / "registry" / "synonyms.yaml"
    if not path.exists():
        return {}
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))["synonyms"]
    return {key: tuple(entry.get("positive", ())) for key, entry in raw.items()}


class LlmChip(BaseModel):
    characteristic: str | None = None
    label: str
    importance: Literal["must", "important", "nice"] = "important"
    params: dict[str, float | int | bool | str] = Field(default_factory=dict)


class LlmTrip(BaseModel):
    from_: date | None = Field(None, alias="from")
    to: date | None = None
    month: int | None = None
    adults: int | None = None
    children: int | None = None
    budgetPerNight: int | None = None  # noqa: N815 - the contract's field name
    area: Literal["center", "khosta", "adler", "sirius", "krasnaya_polyana"] | None = None


class LlmIntent(BaseModel):
    chips: list[LlmChip]
    trip: LlmTrip
    hints: list[str] = Field(default_factory=list, max_length=2)


class IntentParser:
    def __init__(self, uow: UnitOfWork, data_dir: Path, llm: LanguageModel | None = None) -> None:
        self._uow = uow
        self._data_dir = data_dir
        self._llm = llm

    async def vocabulary(self, registry: list[Characteristic] | None = None) -> Vocabulary:
        registry = registry or await Registry(self._uow).all()
        return Vocabulary.build(
            ((c.key, c.title, c.checkable, c.synonyms) for c in registry),
            _guest_phrases(self._data_dir),
        )

    async def parse(self, text: str, *, today: date) -> Intent:
        registry = await Registry(self._uow).all()
        vocabulary = await self.vocabulary(registry)

        async def by_llm(llm: LanguageModel) -> Intent:
            return await _llm_intent(llm, text, registry, today)

        async def by_rules() -> Intent:
            return parse_intent(text, vocabulary, today=today)

        intent, _ = await with_fallback(self._llm, by_llm, by_rules)
        return intent


async def _llm_intent(
    llm: LanguageModel, text: str, registry: list[Characteristic], today: date
) -> Intent:
    catalog = "\n".join(f"- {c.key} — {c.title}" for c in registry)
    system = (
        (PROMPTS / "intent.md")
        .read_text(encoding="utf-8")
        .format(catalog=catalog, today=today.isoformat())
    )
    result = await llm.structured(task="intent", system=system, prompt=text, output=LlmIntent)
    known = {c.key: c for c in registry}
    chips = []
    for i, raw in enumerate(result.output.chips, start=1):
        key = raw.characteristic if raw.characteristic in known else None
        chips.append(
            Chip(
                id=f"c{i}",
                label=raw.label,
                importance=Importance(raw.importance),
                checkable=known[key].checkable if key else Checkable.COMPUTE,
                characteristic=key,
                params=dict(raw.params),
            )
        )
    trip = result.output.trip
    return Intent(
        text=text,
        chips=tuple(chips),
        trip=TripDraft(
            check_in=trip.from_,
            check_out=trip.to,
            month=trip.month,
            adults=trip.adults,
            children=trip.children,
            budget_per_night=trip.budgetPerNight,
            area=trip.area,
        ),
        hints=tuple(result.output.hints[:2]),
        planner="llm",
    )
