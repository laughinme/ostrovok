from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

import yaml
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import select

from app.core.errors import DomainError, ErrorCode, NotFoundError
from app.db.models import CharacteristicRow
from app.db.uow import UnitOfWork
from app.domain.knowledge.characteristic import (
    Characteristic,
    CharacteristicStatus,
    Level,
    MethodKind,
)
from app.domain.knowledge.sources import Authority
from app.domain.knowledge.statements import StatementTemplate
from app.domain.knowledge.values import ValueType
from app.service.recipes.models import Recipe

RECIPE: TypeAdapter[Recipe] = TypeAdapter(Recipe)


class CharacteristicNotFoundError(NotFoundError):
    error_code = ErrorCode.CHARACTERISTIC_NOT_FOUND
    default_detail = "Unknown characteristic"


class InvalidRecipeError(DomainError):
    error_code = ErrorCode.INVALID_RECIPE
    default_detail = "The recipe does not match any method"


def validate_recipe(raw: Mapping[str, Any]) -> Recipe:
    try:
        return RECIPE.validate_python(dict(raw))
    except ValidationError as exc:
        raise InvalidRecipeError(details=exc.errors(include_url=False)) from exc


def parse_characteristic(raw: Mapping[str, Any]) -> Characteristic:
    recipe = validate_recipe(raw["recipe"])
    statement = raw.get("statement", "")
    # YAML 1.1 parses the keys `yes:` and `no:` as booleans, hence both spellings.
    template = (
        StatementTemplate(
            yes=statement.get("yes", statement.get(True)),
            no=statement.get("no", statement.get(False)),
        )
        if isinstance(statement, Mapping)
        else StatementTemplate(template=str(statement))
    )
    return Characteristic(
        key=raw["key"],
        title=raw["title"],
        level=Level(raw["level"]),
        value_type=ValueType(raw["value_type"]),
        method=MethodKind(recipe.kind),
        recipe=recipe.model_dump(mode="json"),
        ttl_days=int(raw["ttl_days"]),
        authority=Authority(raw["authority"]),
        statement=template,
        version=int(raw.get("version", 1)),
        status=CharacteristicStatus(raw.get("status", "published")),
        synonyms=tuple(raw.get("synonyms", ())),
        question=raw.get("question"),
        unit=raw.get("unit"),
        learned_from=raw.get("learned_from"),
        caveats=tuple(raw.get("caveats", ())),
    )


def to_definition(c: Characteristic) -> dict[str, Any]:
    statement: Any = (
        c.statement.template
        if c.statement.template is not None
        else {"yes": c.statement.yes, "no": c.statement.no}
    )
    return {
        "key": c.key,
        "title": c.title,
        "level": c.level.value,
        "value_type": c.value_type.value,
        "recipe": dict(c.recipe),
        "ttl_days": c.ttl_days,
        "authority": c.authority.value,
        "statement": statement,
        "version": c.version,
        "status": c.status.value,
        "synonyms": list(c.synonyms),
        "question": c.question,
        "unit": c.unit,
        "learned_from": c.learned_from,
        "caveats": list(c.caveats),
    }


def load_yaml(path: Path) -> list[Characteristic]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return [parse_characteristic(item) for item in raw["characteristics"]]


class Registry:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def all(self, *, include_drafts: bool = False) -> list[Characteristic]:
        rows = (await self._uow.session.scalars(select(CharacteristicRow))).all()
        items = [parse_characteristic(row.definition) for row in rows]
        if not include_drafts:
            items = [c for c in items if c.status is not CharacteristicStatus.DRAFT]
        return sorted(items, key=lambda c: c.key)

    async def get(self, key: str) -> Characteristic:
        row = await self._uow.session.get(CharacteristicRow, key)
        if row is None:
            raise CharacteristicNotFoundError()
        return parse_characteristic(row.definition)

    async def put(self, characteristic: Characteristic) -> None:
        row = await self._uow.session.get(CharacteristicRow, characteristic.key)
        if row is None:
            self._uow.session.add(
                CharacteristicRow(
                    key=characteristic.key,
                    version=characteristic.version,
                    status=characteristic.status.value,
                    definition=to_definition(characteristic),
                )
            )
        else:
            row.version = characteristic.version
            row.status = characteristic.status.value
            row.definition = to_definition(characteristic)
        await self._uow.flush()


class RegistryLoader:
    name = "registry"

    def sources(self, data_dir: Path) -> Sequence[Path]:
        return [data_dir / "registry" / "characteristics.yaml"]

    async def load(self, uow: UnitOfWork, data_dir: Path) -> str:
        items = load_yaml(data_dir / "registry" / "characteristics.yaml")
        registry = Registry(uow)
        for item in items:
            await registry.put(item)
        return f"{len(items)} characteristics"
