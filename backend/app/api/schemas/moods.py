from typing import Self

from app.api.schemas.base import ApiModel
from app.api.schemas.search import IntentChipModel
from app.domain.search.moods import MoodCount


class MoodOut(ApiModel):
    id: str
    title: str
    description: str
    count: int
    count_label: str
    month: int
    chips: list[IntentChipModel]

    @classmethod
    def from_domain(cls, value: MoodCount, month: int) -> Self:
        mood = value.mood
        return cls(
            id=mood.id,
            title=mood.title,
            description=mood.description,
            count=value.count,
            count_label=value.count_label,
            month=month,
            chips=[IntentChipModel.from_domain(c) for c in mood.chips],
        )
