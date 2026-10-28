from pathlib import Path
from uuid import UUID

import pytest
from sqlalchemy import func, select

from app.core.errors import ConflictError, DomainError
from app.db.database import Database
from app.db.models import FacadeRoom, HotelierAnswer, HotelierQuestion, ObservationRow, RoomType
from app.domain.knowledge.scope import Facade
from app.service.knowledge.facts import FactQueries
from app.service.partner.answers import PartnerAnswers
from app.service.partner.facades import FacadeMapping, PartnerFacades
from app.service.partner.questions import PartnerQuestions
from tests.factories import FakeClock
from tests.integration.test_partner_questions import MAYAK, partner_world


async def _question(db: Database, key: str) -> UUID:
    async with db.unit_of_work() as uow:
        questions = await PartnerQuestions(uow, FakeClock()).generate(MAYAK)
        return next(q.id for q in questions if q.characteristic == key)


async def test_uncertain_answer_keeps_question_open_without_observations(
    db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    question_id = await _question(db, "soundproofing")
    async with db.unit_of_work() as uow:
        result = await PartnerAnswers(uow, FakeClock()).submit(
            question_id, text="Вроде окна хорошие, кажется"
        )
        assert result.clarification
        assert not result.changed
    async with db.unit_of_work() as uow:
        question = await uow.session.get(HotelierQuestion, question_id)
        assert question
        assert question.status == "open"
        assert await uow.session.scalar(select(func.count()).select_from(ObservationRow)) == 0
        assert await uow.session.scalar(select(func.count()).select_from(HotelierAnswer)) == 1
        result = await PartnerAnswers(uow, FakeClock()).submit(
            question_id, payload={"choice": "Нет"}
        )
        assert result.changed
        assert all(f.value is False for f in result.changed)
    async with db.unit_of_work() as uow:
        with pytest.raises(ConflictError):
            await PartnerAnswers(uow, FakeClock()).submit(question_id, text="Да")


async def test_facade_form_validates_ownership_and_records_hotel_observation(
    db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    async with db.unit_of_work() as uow:
        uow.session.add(
            RoomType(
                id="mayak:deluxe",
                hotel_id=MAYAK,
                name="Делюкс",
                area=25,
                bed="double",
                capacity=2,
                rates=[],
            )
        )
    async with db.unit_of_work() as uow:
        invalid = FacadeMapping("foreign:room", Facade.S, 4, 8)
        with pytest.raises(DomainError):
            await PartnerFacades(uow, FakeClock()).replace(MAYAK, [invalid])
    async with db.unit_of_work() as uow:
        result = await PartnerFacades(uow, FakeClock()).replace(
            MAYAK, [FacadeMapping("mayak:deluxe", Facade.S, 4, 8)]
        )
        assert result.changed_facts
    async with db.unit_of_work() as uow:
        mark = await uow.session.scalar(select(FacadeRoom).where(FacadeRoom.hotel_id == MAYAK))
        assert mark
        assert mark.confirmed_by_hotel
        assert mark.floor_from == 4
        facts = await FactQueries(uow).of_hotel(MAYAK, "facade_rooms")
        assert facts
        assert facts[0].source.value == "hotelier"
