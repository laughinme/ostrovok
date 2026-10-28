from collections.abc import Sequence
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.errors import ErrorCode, NotFoundError
from app.db.models import ConflictRow, HotelierQuestion
from app.db.uow import UnitOfWork
from app.domain.knowledge.characteristic import Characteristic, MethodKind
from app.domain.knowledge.fact import Fact
from app.domain.knowledge.scope import Facade
from app.domain.partner.questions import QuestionDraft, question_value
from app.service.catalog.hotels import HotelNotFoundError
from app.service.knowledge.facts import yes_probability
from app.service.knowledge.registry import Registry
from app.service.partner.demand import PartnerDemand
from app.service.ports import Clock

SIDE_NAMES = dict(
    zip(
        Facade,
        (
            "северную",
            "северо-восточную",
            "восточную",
            "юго-восточную",
            "южную",
            "юго-западную",
            "западную",
            "северо-западную",
        ),
        strict=True,
    )
)


class QuestionNotFoundError(NotFoundError):
    error_code = ErrorCode.QUESTION_NOT_FOUND
    default_detail = "Question not found"


@dataclass(frozen=True, slots=True)
class QuestionView:
    id: UUID
    hotel_id: UUID
    characteristic: str
    text: str
    why: str
    value: float
    answer_kind: str
    options: tuple[str, ...]
    status: str

    @classmethod
    def of(cls, row: HotelierQuestion) -> "QuestionView":
        return cls(
            row.id,
            row.hotel_id,
            row.characteristic,
            row.text,
            row.why,
            row.value,
            row.answer_kind,
            tuple(row.options),
            row.status,
        )


def _draft(
    c: Characteristic, facts: Sequence[Fact], demand: int, influence: float
) -> QuestionDraft:
    probabilities = [yes_probability(f) for f in facts if f.characteristic == c.key]
    known = [p for p in probabilities if p is not None]
    probability = min(known, key=lambda p: abs(p - 0.5)) if known else None
    if not known and any(f.characteristic == c.key for f in facts):
        probability = max(f.confidence for f in facts if f.characteristic == c.key)
    kind = str(c.recipe.get("answer_kind", "free_text"))
    return QuestionDraft(
        c.key,
        c.question or str(c.recipe.get("question", c.title)),
        f"{demand} гостей за неделю искали: {c.title.lower()}",
        question_value(demand, probability, influence),
        "choice" if kind == "yes_no" else kind,
        ("Да", "Нет") if kind == "yes_no" else tuple(c.recipe.get("options", ())),
    )


class PartnerQuestions:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow, self._clock = uow, clock

    async def of_hotel(self, hotel_id: UUID) -> list[QuestionView]:
        rows = await self._uow.session.scalars(
            select(HotelierQuestion)
            .where(HotelierQuestion.hotel_id == hotel_id)
            .order_by(
                HotelierQuestion.value.desc(), HotelierQuestion.created_at, HotelierQuestion.id
            )
        )
        return [QuestionView.of(row) for row in rows]

    async def generate(
        self, hotel_id: UUID, *, run_id: UUID | None = None, limit: int = 5
    ) -> list[QuestionView]:
        hotel = await self._uow.catalog.hotel(hotel_id)
        if hotel is None:
            raise HotelNotFoundError()
        await self._uow.knowledge.lock_pair(hotel_id, "partner_questions")
        facts = await self._uow.knowledge.facts([hotel_id])
        demand = PartnerDemand(self._uow, self._clock)
        counts = await demand.weekly(hotel.district)
        influences = await demand.influence(hotel_id, hotel.district)
        registry = await Registry(self._uow).all()
        drafts = [
            _draft(c, facts, counts.get(c.key, 0), influences.get(c.key, 1.0))
            for c in registry
            if c.method is MethodKind.ASK_HOTELIER or c.question
        ]
        drafts = await self._conflicts(hotel_id, facts, drafts)
        existing = await self.of_hotel(hotel_id)
        excluded = {q.characteristic for q in existing}
        slots = max(0, min(5, max(3, limit)) - sum(q.status == "open" for q in existing))
        candidates = sorted(
            drafts,
            key=lambda d: (d.conflict_id is not None, d.value, d.characteristic),
            reverse=True,
        )
        for draft in [d for d in candidates if d.characteristic not in excluded][:slots]:
            await self._insert(hotel_id, draft, run_id)
        return await self.of_hotel(hotel_id)

    async def _conflicts(
        self, hotel_id: UUID, facts: list[Fact], drafts: list[QuestionDraft]
    ) -> list[QuestionDraft]:
        conflicts = list(
            await self._uow.session.scalars(
                select(ConflictRow).where(
                    ConflictRow.hotel_id == hotel_id, ConflictRow.status == "waiting_hotel"
                )
            )
        )
        if not conflicts:
            return drafts
        conflict = conflicts[0]
        positives = [
            f for f in facts if f.characteristic == conflict.characteristic and f.value is True
        ]
        side = next(
            (f for f in Facade if any(p.scope.facades and f in p.scope.facades for p in positives)),
            None,
        )
        text = (
            f"Какие категории номеров выходят на {SIDE_NAMES[side]} сторону?"
            if side
            else "Какие категории номеров выходят на каждую сторону здания?"
        )
        context = "Расчёт расходится с заявлением отеля; уточните категории и этажи"
        return [d for d in drafts if d.characteristic != "facade_rooms"] + [
            QuestionDraft(
                "facade_rooms",
                text,
                context,
                max((d.value for d in drafts), default=0),
                "facade_mapping",
                conflict_id=str(conflict.id),
                facade=side.value if side else None,
            )
        ]

    async def _insert(self, hotel_id: UUID, draft: QuestionDraft, run_id: UUID | None) -> None:
        question_id = uuid4()
        stmt = (
            insert(HotelierQuestion)
            .values(
                id=question_id,
                hotel_id=hotel_id,
                characteristic=draft.characteristic,
                text=draft.text,
                why=draft.why,
                value=draft.value,
                answer_kind=draft.answer_kind,
                options=list(draft.options),
                context={"conflictId": draft.conflict_id, "facade": draft.facade},
                run_id=run_id,
                created_at=self._clock.now(),
            )
            .on_conflict_do_nothing(
                index_elements=["hotel_id", "characteristic"],
                index_where=HotelierQuestion.status == "open",
            )
            .returning(HotelierQuestion.id)
        )
        inserted = await self._uow.session.scalar(stmt)
        if inserted and draft.conflict_id:
            conflict = await self._uow.session.get(ConflictRow, UUID(draft.conflict_id))
            if conflict:
                conflict.question_id = inserted
        await self._uow.flush()
