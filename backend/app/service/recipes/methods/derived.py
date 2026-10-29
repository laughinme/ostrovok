from math import prod
from typing import ClassVar

from app.domain.knowledge.characteristic import MethodKind
from app.domain.knowledge.observation import Evidence, EvidenceKind
from app.domain.knowledge.scope import Scope
from app.domain.knowledge.values import probability_of_yes
from app.service.recipes.executor import Environment, Finding, MethodCall, NoDataError
from app.service.recipes.models import DerivedRecipe


class DerivedExecutor:
    method: ClassVar[MethodKind] = MethodKind.DERIVED

    async def collect(self, call: MethodCall, env: Environment) -> list[Finding]:
        recipe = call.recipe_of(DerivedRecipe)
        parts = []
        for key in recipe.keys:
            values = await env.reader.facts_values(call.hotel, key)
            if not values:
                raise NoDataError(f"нет фактов «{key}»")
            parts.append(max(probability_of_yes(v, c) for v, c in values))
        match recipe.op:
            case "all":
                p = prod(parts)
            case "any":
                p = 1 - prod(1 - x for x in parts)
            case "not":
                p = 1 - parts[0]
        await call.tracer.tool(
            "facts.read",
            summary=f"{recipe.op}({', '.join(recipe.keys)}) = {p:.2f}",
            args={"keys": recipe.keys},
        )
        return [
            Finding(
                scope=Scope.everywhere(),
                value=p >= 0.5,
                confidence=round(max(p, 1 - p), 3),
                source_ref=f"method:derived@{call.characteristic.version}",
                method=f"вывод из фактов: {', '.join(recipe.keys)}",
                evidence=(
                    Evidence(
                        kind=EvidenceKind.TEXT,
                        summary=f"считается из: {', '.join(recipe.keys)}",
                        attribution="",
                    ),
                ),
            )
        ]
