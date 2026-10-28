from collections.abc import Sequence
from dataclasses import dataclass
from uuid import UUID

from app.core.errors import DomainError
from app.domain.knowledge.scope import Facade, Scope
from app.domain.search.intent import Chip
from app.domain.search.score import Match, Variant


@dataclass(frozen=True, slots=True)
class Selection:
    hotel_id: UUID
    room_type_id: str | None = None
    facade: Facade | None = None
    floor: int | None = None

    def variants(self, variants: Sequence[Variant]) -> tuple[Variant, ...]:
        result = []
        for variant in variants:
            if self.room_type_id and variant.room_type_id != self.room_type_id:
                continue
            scope = variant.scope
            if self.facade and scope.facades and self.facade not in scope.facades:
                continue
            if self.floor and not (scope.floor_from or 1) <= self.floor <= (
                scope.floor_to or self.floor
            ):
                continue
            result.append(
                Variant(
                    Scope(
                        facades=frozenset({self.facade}) if self.facade else scope.facades,
                        floor_from=self.floor or scope.floor_from,
                        floor_to=self.floor or scope.floor_to,
                        months=scope.months,
                        room_types=scope.room_types,
                    ),
                    variant.room_type_id,
                    variant.room_name,
                    variant.confirmed_by_hotel,
                    variant.price,
                )
            )
        return tuple(result)


def validate_selections(selections: Sequence[Selection]) -> None:
    if not 2 <= len(selections) <= 3 or len(set(selections)) != len(selections):
        raise DomainError("Выберите 2–3 разных отеля или варианта номера")
    if any(s.floor is not None and s.floor < 1 for s in selections):
        raise DomainError("Этаж должен быть положительным")


def comparison_summary(matches: Sequence[Match], chips: Sequence[Chip]) -> str:
    lines = []
    for index, chip in enumerate(chips):
        known = [m for m in matches if m.per_chip[index].probability is not None]
        if len(known) < 2:
            continue
        ordered = sorted(known, key=lambda m: m.per_chip[index].probability or 0, reverse=True)
        best, second = ordered[0], ordered[1]
        if (best.per_chip[index].probability or 0) - (
            second.per_chip[index].probability or 0
        ) > 0.05:
            name = best.variant.room_name or best.hotel.name
            lines.append(f"{name} лучше по желанию «{chip.label.lower()}»")
    if lines:
        return "; ".join(lines)
    if any(r.probability is None for m in matches for r in m.per_chip) or not chips:
        return "Пока недостаточно фактов для уверенного сравнения"
    return "По выбранным желаниям варианты сопоставимы"
