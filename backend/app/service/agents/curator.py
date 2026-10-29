from collections.abc import Sequence
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any, Literal
from uuid import UUID

import yaml
from pydantic import BaseModel, Field, model_validator
from rapidfuzz import fuzz, process

from app.db.database import Database
from app.db.repositories.catalog import hotel_geo
from app.domain.knowledge.characteristic import (
    Characteristic,
    CharacteristicStatus,
    Level,
    MethodKind,
)
from app.domain.knowledge.curation import Decision, RecipeDraft, place_terms, propose
from app.domain.knowledge.sources import Authority
from app.domain.knowledge.statements import StatementTemplate
from app.domain.knowledge.values import ValueType
from app.service.agents.fallback import with_fallback
from app.service.agents.runtime import Tracer
from app.service.knowledge.registry import InvalidRecipeError, Registry, validate_recipe
from app.service.ports import Budget, LanguageModel, ToolSpec
from app.service.recipes.executor import Environment, MethodCall, MethodExecutor, NoDataError
from app.service.recipes.models import AskHotelierRecipe, Recipe, TagFilter

PROMPTS = Path(__file__).resolve().parent / "prompts"
SAMPLE_DISTRICTS = ("center", "khosta", "adler", "sirius", "krasnaya_polyana")
_TTL = {MethodKind.POI_NEARBY: 90, MethodKind.ASK_HOTELIER: 180}
VOCABULARY_MATCH = 70


@cache
def _places(data_dir: Path) -> list[Any]:
    path = data_dir / "registry" / "osm_vocabulary.yaml"
    return place_terms(yaml.safe_load(path.read_text(encoding="utf-8"))) if path.exists() else []


class LlmDraft(BaseModel):
    decision: Literal["compute", "ask_hotelier", "cannot"]
    key: str = Field("", pattern=r"^[a-z0-9_]{0,48}$")
    title: str = ""
    recipe: Recipe | None = None
    yes: str = ""
    no: str = ""
    synonyms: list[str] = Field(default_factory=list, max_length=8)
    reason: str = Field("", description="Почему этот метод и эти параметры, одной фразой")

    @model_validator(mode="after")
    def _recipe_fits_decision(self) -> "LlmDraft":
        if self.decision == "cannot":
            return self
        if self.recipe is None or not self.key or not self.title:
            raise ValueError("compute и ask_hotelier требуют key, title и recipe")
        if (self.decision == "ask_hotelier") != isinstance(self.recipe, AskHotelierRecipe):
            raise ValueError("ask_hotelier ⇔ recipe.kind = ask_hotelier")
        return self


class TagQuery(BaseModel):
    filter: TagFilter


class WordQuery(BaseModel):
    word: str = Field(description="Как гость называет место: «аптека», «хинкальная», «рынок»")


@dataclass(frozen=True, slots=True)
class Lesson:
    characteristic: Characteristic | None
    draft: RecipeDraft
    trial: tuple[tuple[str, str], ...]


class Curator:
    def __init__(
        self,
        db: Database,
        env: Environment,
        executors: dict[MethodKind, MethodExecutor],
        llm: LanguageModel | None,
        data_dir: Path,
    ) -> None:
        self._db = db
        self._env = env
        self._executors = executors
        self._llm = llm
        self._data_dir = data_dir

    async def learn(
        self,
        description: str,
        tracer: Tracer,
        *,
        status: CharacteristicStatus = CharacteristicStatus.PROVISIONAL,
        learned_from: str = "запрос гостя",
        sample: Sequence[UUID] = (),
    ) -> Lesson:
        await tracer.reason(f"Новое желание: «{description}». Ищу, чем это проверить")
        draft = await self.plan(description, tracer)
        if draft.decision is Decision.CANNOT:
            await tracer.decide(f"Проверить не можем: {draft.reason}")
            return Lesson(None, draft, ())
        try:
            recipe = validate_recipe(draft.recipe)
        except InvalidRecipeError:
            await tracer.error("Рецепт не прошёл проверку схемы - беру план на правилах")
            draft = propose(description, _places(self._data_dir))
            recipe = validate_recipe(draft.recipe)
        await tracer.tool(
            "recipe.validate",
            summary=f"метод {recipe.kind}: рецепт корректен",
            args=recipe.model_dump(mode="json", exclude_defaults=True),
        )
        characteristic = _characteristic(
            draft, recipe.model_dump(mode="json"), status, learned_from
        )
        if recipe.kind == "poi_nearby":
            await self._stats(recipe.poi, tracer)
        trial = await self._dry_run(characteristic, sample, tracer)
        async with self._db.unit_of_work() as uow:
            await Registry(uow).put(characteristic)
        saved_as = (
            "черновик"
            if status is CharacteristicStatus.DRAFT
            else "выученная из запросов, ждёт проверки"
        )
        await tracer.decide(
            f"Характеристика «{characteristic.title}» сохранена: {saved_as}",
            output={"key": characteristic.key, "status": status.value},
        )
        return Lesson(characteristic, draft, trial)

    async def plan(self, description: str, tracer: Tracer) -> RecipeDraft:
        places = _places(self._data_dir)

        async def by_llm(llm: LanguageModel) -> RecipeDraft:
            async with self._db.unit_of_work() as uow:
                registry = await Registry(uow).all()
            catalog = "\n".join(f"- {c.key} - {c.title}" for c in registry)
            result = await llm.run_tools(
                task="curator",
                system=(PROMPTS / "curator.md")
                .read_text(encoding="utf-8")
                .replace("{catalog}", catalog),
                prompt=description,
                tools=self._tools(tracer, places),
                output=LlmDraft,
                budget=Budget(max_requests=8, max_tool_calls=8, max_seconds=45),
            )
            await tracer.llm("curator", result)
            out = result.output
            recipe = out.recipe.model_dump(mode="json") if out.recipe else {}
            return RecipeDraft(
                decision=Decision(out.decision),
                reason=out.reason or "план LLM",
                key=out.key,
                title=out.title,
                recipe=recipe,
                yes=out.yes or out.title,
                no=out.no or f"{out.title} - нет",
                synonyms=tuple(out.synonyms),
                question=recipe.get("question"),
            )

        async def by_rules() -> RecipeDraft:
            return propose(description, places)

        draft, planner = await with_fallback(self._llm, by_llm, by_rules, tracer=tracer)
        await tracer.decide(
            f"План ({'LLM' if planner.value == 'llm' else 'правила'}): {draft.reason}",
            output={"decision": draft.decision.value, "recipe": dict(draft.recipe)},
        )
        return draft

    def _tools(self, tracer: Tracer, places: Sequence[Any]) -> list[ToolSpec]:

        async def tag_stats(args: BaseModel) -> dict[str, Any]:
            assert isinstance(args, TagQuery)  # noqa: S101
            found = await self._env.reader.matching(args.filter)
            named = [f.name for f in found if f.name]
            await tracer.tool(
                "osm.tag_stats",
                summary=f"{len(found)} объектов в регионе, у {len(named)} есть название",
                args=args.filter.model_dump(exclude_defaults=True),
            )
            return {"count": len(found), "named": len(named), "examples": named[:5]}

        async def vocabulary(args: BaseModel) -> list[dict[str, Any]]:
            assert isinstance(args, WordQuery)  # noqa: S101
            names = {t.name: t for t in places}
            hits = process.extract(args.word.lower(), list(names), scorer=fuzz.WRatio, limit=3)
            terms = [names[name] for name, score, _ in hits if score >= VOCABULARY_MATCH]
            await tracer.tool(
                "osm.vocabulary",
                summary=f"«{args.word}» → " + (", ".join(t.name for t in terms) or "в словаре нет"),
                args={"word": args.word},
            )
            return [
                {
                    "term": t.name,
                    "any_of": [dict(a) for a in t.any_of],
                    "name_regex": t.name_regex,
                    "uncertain": t.uncertain,
                }
                for t in terms
            ]

        return [
            ToolSpec(
                name="osm_tag_stats",
                description="Сколько объектов OSM в регионе подходит под фильтр тегов, "
                "сколько из них с названием, и до пяти названий для примера",
                args=TagQuery,
                call=tag_stats,
            ),
            ToolSpec(
                name="osm_vocabulary",
                description="Словарь «слово гостя → теги OSM» (150 видов мест Сочи): "
                "проверенные варианты фильтра для poi_nearby",
                args=WordQuery,
                call=vocabulary,
            ),
        ]

    async def _stats(self, tag_filter: TagFilter, tracer: Tracer) -> None:
        found = await self._env.reader.matching(tag_filter)
        named = sum(1 for f in found if f.name)
        await tracer.tool(
            "osm.tag_stats",
            summary=f"{len(found)} объектов в регионе, у {named} есть название",
            args=tag_filter.model_dump(exclude_defaults=True),
        )

    async def _dry_run(
        self, characteristic: Characteristic, sample: Sequence[UUID], tracer: Tracer
    ) -> tuple[tuple[str, str], ...]:
        executor = self._executors.get(characteristic.method)
        if executor is None:
            await tracer.decide("Этот метод считают отельеры: пробный прогон не нужен, спросим")
            return ()
        hotels = await self._sample(sample)
        outcomes = []
        for hotel in hotels:
            call = MethodCall(hotel, characteristic, validate_recipe(characteristic.recipe), tracer)
            try:
                findings = await executor.collect(call, self._env)
            except NoDataError as exc:
                outcomes.append((hotel.name, f"нет данных: {exc}"))
                continue
            best = max(findings, key=lambda f: f.confidence)
            outcomes.append(
                (
                    hotel.name,
                    "да" if best.value is True else "нет" if best.value is False else "есть",
                )
            )
        await tracer.tool(
            "recipe.dry_run",
            summary=f"пробный прогон на {len(hotels)} отелях: "
            + ", ".join(f"{name} - {result}" for name, result in outcomes),
        )
        return tuple(outcomes)

    async def _sample(self, preferred: Sequence[UUID]) -> list[Any]:
        async with self._db.unit_of_work() as uow:
            if preferred:
                return [hotel_geo(h) for h in await uow.catalog.hotels(list(preferred)[:5])]
            hotels = await uow.catalog.hotels()
        picked: dict[str, Any] = {}
        for hotel in hotels:
            picked.setdefault(hotel.district, hotel)
        return [hotel_geo(picked[d]) for d in SAMPLE_DISTRICTS if d in picked]


def _characteristic(
    draft: RecipeDraft, recipe: dict[str, Any], status: CharacteristicStatus, learned_from: str
) -> Characteristic:
    method = MethodKind(recipe["kind"])
    return Characteristic(
        key=draft.key,
        title=draft.title,
        level=Level.HOTEL,
        value_type=ValueType.PROBABILITY,
        method=method,
        recipe=recipe,
        ttl_days=_TTL.get(method, 180),
        authority=Authority.HOTELIER if method is MethodKind.ASK_HOTELIER else Authority.FRESHEST,
        statement=StatementTemplate(yes=draft.yes, no=draft.no),
        status=status,
        synonyms=draft.synonyms,
        question=draft.question,
        learned_from=learned_from,
        caveats=draft.caveats,
    )
