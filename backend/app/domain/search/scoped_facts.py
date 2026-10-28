from collections.abc import Sequence

from app.domain.knowledge.fact import Fact
from app.domain.knowledge.scope import Scope


def compatible_facts(
    facts: Sequence[Fact], scope: Scope, room_type_id: str | None, months: frozenset[int]
) -> list[Fact]:
    result = []
    for fact in facts:
        area = fact.scope
        if area.room_types and room_type_id not in area.room_types:
            continue
        if area.facades and scope.facades and not area.facades & scope.facades:
            continue
        if area.months and not area.months & months:
            continue
        if (area.floor_to or float("inf")) < (scope.floor_from or 1):
            continue
        if (scope.floor_to or float("inf")) < (area.floor_from or 1):
            continue
        result.append(fact)
    return result


def specificity(fact: Fact) -> int:
    scope = fact.scope
    return sum(
        value is not None
        for value in (
            scope.room_types,
            scope.facades,
            scope.floor_from,
            scope.floor_to,
            scope.months,
        )
    )
