"""Saved wishes: count hotels with a compatible variant that satisfies every chip."""

import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from uuid import UUID

from app.domain.knowledge.fact import Fact
from app.domain.search.intent import Chip
from app.domain.search.score import SearchHotel, TripWindow, Verdict, evaluate, verdict


@dataclass(frozen=True, slots=True)
class Mood:
    id: str
    title: str
    description: str
    count_suffix: str
    chips: tuple[Chip, ...]


@dataclass(frozen=True, slots=True)
class MoodCount:
    mood: Mood
    count: int

    @property
    def count_label(self) -> str:
        n = self.count
        noun = (
            "отелей"
            if 11 <= n % 100 <= 14
            else "отель"
            if n % 10 == 1
            else "отеля"
            if 2 <= n % 10 <= 4
            else "отелей"
        )
        return f"{n} {noun} {self.mood.count_suffix}"


def count_moods(
    moods: Sequence[Mood],
    hotels: Sequence[SearchHotel],
    facts: Mapping[UUID, Mapping[str, Sequence[Fact]]],
    trip: TripWindow,
) -> tuple[MoodCount, ...]:
    criteria = {
        (m.id, c.id): (c.characteristic, json.dumps(dict(c.params), sort_keys=True))
        for m in moods
        for c in m.chips
    }
    counts = dict.fromkeys((m.id for m in moods), 0)
    for hotel in hotels:
        matched: set[str] = set()
        known = facts.get(hotel.id, {})
        for variant in hotel.variants:
            cache: dict[tuple[str | None, str], bool] = {}
            for mood in moods:
                if mood.id in matched or not mood.chips:
                    continue
                for chip in mood.chips:
                    key = criteria[mood.id, chip.id]
                    if key not in cache:
                        p, _ = evaluate(
                            chip, known.get(chip.characteristic or "", ()), variant, hotel, trip
                        )
                        cache[key] = verdict(p) is Verdict.YES
                    if not cache[key]:
                        break
                else:
                    matched.add(mood.id)
            if len(matched) == len(moods):
                break
        for mood_id in matched:
            counts[mood_id] += 1
    return tuple(MoodCount(m, counts[m.id]) for m in moods)
