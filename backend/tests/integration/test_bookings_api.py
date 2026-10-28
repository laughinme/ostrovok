from datetime import timedelta
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy import select

from app.db.database import Database
from app.db.models import BookingRow, FacadeRoom, Job, RoomType, TripFeedbackRow
from app.domain.booking.status import BookingStatus
from app.domain.catalog import hotel_id
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.scope import Facade, Scope
from app.domain.knowledge.sources import SourceKind
from app.service.booking.bookings import BookingService
from app.service.booking.promise_changes import notify_changed_promises
from app.service.booking.simulator import BookingSimulator
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import RegistryLoader
from app.service.ports import RecordingEventBus
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders
from tests.factories import FakeClock, register
from tests.seed_data import write_region

HOTEL = hotel_id("way/1")
DATA = Path(__file__).resolve().parents[2] / "data"


async def world(db: Database, tmp_path: Path, clock: FakeClock) -> UUID:
    await run_seed(db, write_region(tmp_path), seed_loaders())
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, DATA)
        uow.session.add(
            RoomType(
                id="suite",
                hotel_id=HOTEL,
                name="Люкс",
                area=30,
                bed="double",
                capacity=2,
                rates=[{"id": "flex", "price": 5000}],
            )
        )
        await uow.flush()
        uow.session.add(
            FacadeRoom(
                hotel_id=HOTEL,
                room_type_id="suite",
                facade="S",
                floor_from=4,
                floor_to=6,
                confirmed_by_hotel=True,
            )
        )
        result = await KnowledgeStore(uow, clock).record(
            [
                Observation(
                    hotel_id=HOTEL,
                    characteristic="sea_view",
                    characteristic_version=1,
                    scope=Scope(facades=frozenset({Facade.S}), floor_from=4),
                    value=True,
                    confidence=0.8,
                    source=SourceKind.COMPUTED,
                    source_ref="view:test",
                    method="test",
                    observed_at=clock.now(),
                    valid_until=clock.now() + timedelta(days=365),
                )
            ],
            reason="test",
        )
        return result.changed_facts[0].id


def booking_payload(clock: FakeClock) -> dict[str, object]:
    return {
        "hotelId": str(HOTEL),
        "roomTypeId": "suite",
        "ratePlanId": "flex",
        "checkIn": (clock.now().date() + timedelta(days=1)).isoformat(),
        "checkOut": (clock.now().date() + timedelta(days=3)).isoformat(),
        "guests": {"adults": 2, "children": 0},
    }


async def test_booking_simulation_trip_and_scoped_feedback(
    client: AsyncClient,
    app: FastAPI,
    db: Database,
    tmp_path: Path,
) -> None:
    clock = FakeClock()
    app.state.clock = clock
    await world(db, tmp_path, clock)
    guest = await register(client)
    response = await client.post(
        "/api/v1/bookings", headers=guest.headers, json=booking_payload(clock)
    )
    assert response.status_code == 201, response.text
    booking = response.json()
    booking_id = UUID(booking["id"])
    assert booking["request"] == "Ю-сторона · этаж ≥ 4"
    assert booking["priceDemo"] == 10000
    async with db.unit_of_work() as uow:
        job = await uow.session.scalar(select(Job).where(Job.kind == "booking.simulate"))
        assert job is not None
        assert job.available_at > clock.now()
    simulator = BookingSimulator(db, clock, RecordingEventBus())
    await simulator.respond(booking_id)
    await simulator.respond(booking_id)
    trip = (await client.get(f"/api/v1/trips/{booking_id}", headers=guest.headers)).json()
    assert trip["booking"]["status"] == "confirmed"
    assert len(trip["sunsets"]) == 2
    promised = trip["promised"][0]
    assert promised["scope"]["months"] == [clock.now().month]
    assert promised["scope"]["floorTo"] == 6
    answers = {"answers": [{"factId": promised["factId"], "answer": False}]}
    early = await client.post(
        f"/api/v1/trips/{booking_id}/feedback", headers=guest.headers, json=answers
    )
    assert early.status_code == 400
    clock.advance(timedelta(days=4))
    sent = await client.post(
        f"/api/v1/trips/{booking_id}/feedback", headers=guest.headers, json=answers
    )
    assert sent.status_code == 204, sent.text
    repeated = await client.post(
        f"/api/v1/trips/{booking_id}/feedback", headers=guest.headers, json=answers
    )
    assert repeated.status_code == 409
    async with db.unit_of_work() as uow:
        row = await uow.session.get(BookingRow, booking_id)
        assert row is not None
        assert row.status == "completed"
        assert await uow.session.scalar(select(TripFeedbackRow)) is not None
        facts = await uow.knowledge.facts([HOTEL], characteristic="sea_view")
        affected = [
            f for f in facts if f.scope.floor_to == 6 and f.scope.months == {clock.now().month}
        ]
        assert affected
        assert affected[0].confidence < promised["confidence"]
    messages = (await client.get("/api/v1/me/notifications", headers=guest.headers)).json()
    assert len(messages) == 1
    assert messages[0]["kind"] == "booking.status"


async def test_booking_validates_rate_capacity_and_ownership(
    client: AsyncClient,
    app: FastAPI,
    db: Database,
    tmp_path: Path,
) -> None:
    clock = FakeClock()
    app.state.clock = clock
    await world(db, tmp_path, clock)
    guest = await register(client)
    data = booking_payload(clock)
    assert (await client.post("/api/v1/bookings", json=data)).status_code == 401
    for invalid in (
        {"ratePlanId": "fake"},
        {"guests": {"adults": 3}},
        {"checkOut": data["checkIn"]},
    ):
        response = await client.post("/api/v1/bookings", headers=guest.headers, json=data | invalid)
        assert response.status_code == 400, response.text
    booking = (await client.post("/api/v1/bookings", headers=guest.headers, json=data)).json()
    other = await register(client, email="other@example.com")
    response = await client.get(f"/api/v1/trips/{booking['id']}", headers=other.headers)
    assert response.status_code == 404
    unknown = {"answers": [{"factId": str(uuid4()), "answer": True}]}
    async with db.unit_of_work() as uow:
        await BookingService(uow, clock).decide(UUID(booking["id"]), BookingStatus.CONFIRMED, "Да")
    clock.advance(timedelta(days=4))
    response = await client.post(
        f"/api/v1/trips/{booking['id']}/feedback", headers=guest.headers, json=unknown
    )
    assert response.status_code == 400


async def test_changed_promises_notify_only_future_guest_once(
    client: AsyncClient,
    app: FastAPI,
    db: Database,
    tmp_path: Path,
) -> None:
    clock = FakeClock()
    app.state.clock = clock
    await world(db, tmp_path, clock)
    guest = await register(client)
    booking = (
        await client.post("/api/v1/bookings", headers=guest.headers, json=booking_payload(clock))
    ).json()
    async with db.unit_of_work() as uow:
        await KnowledgeStore(uow, clock).record(
            [
                Observation(
                    hotel_id=HOTEL,
                    characteristic="sea_view",
                    characteristic_version=1,
                    scope=Scope(facades=frozenset({Facade.S}), floor_from=4),
                    value=False,
                    confidence=0.95,
                    source=SourceKind.COMPUTED,
                    source_ref="view:test",
                    method="test",
                    observed_at=clock.now() + timedelta(seconds=1),
                )
            ],
            reason="world.changed",
        )
    for _ in range(2):
        await notify_changed_promises(db, clock, RecordingEventBus(), HOTEL, "sea_view")
    messages = (await client.get("/api/v1/me/notifications", headers=guest.headers)).json()
    assert len(messages) == 1
    assert messages[0]["kind"] == "promise.changed"
    assert messages[0]["link"] == f"/trips/{booking['id']}"


async def test_record_feedback_lowers_accuracy_without_inventing_a_new_measurement(
    client: AsyncClient,
    app: FastAPI,
    db: Database,
    tmp_path: Path,
) -> None:
    clock = FakeClock()
    app.state.clock = clock
    await world(db, tmp_path, clock)
    async with db.unit_of_work() as uow:
        await KnowledgeStore(uow, clock).record(
            [
                Observation(
                    hotel_id=HOTEL,
                    characteristic="beach_walk",
                    characteristic_version=1,
                    scope=Scope.everywhere(),
                    value={"minutes": 18},
                    confidence=0.9,
                    source=SourceKind.COMPUTED,
                    source_ref="walk:test",
                    method="test",
                    observed_at=clock.now(),
                )
            ],
            reason="test",
        )
    guest = await register(client)
    booking = (
        await client.post("/api/v1/bookings", headers=guest.headers, json=booking_payload(clock))
    ).json()
    booking_id = UUID(booking["id"])
    async with db.unit_of_work() as uow:
        row = await uow.session.get(BookingRow, booking_id)
        promise = next(p for p in row.promised if p["characteristic"] == "beach_walk")
        await BookingService(uow, clock).decide(booking_id, BookingStatus.CONFIRMED, "Да")
    clock.advance(timedelta(days=4))
    response = await client.post(
        f"/api/v1/trips/{booking_id}/feedback",
        headers=guest.headers,
        json={"answers": [{"factId": promise["factId"], "answer": False}]},
    )
    assert response.status_code == 204, response.text
    async with db.unit_of_work() as uow:
        facts = await uow.knowledge.facts([HOTEL], characteristic="beach_walk")
        feedback = next(f for f in facts if f.source is SourceKind.GUEST)
        assert feedback.value == {"minutes": 18}
        assert feedback.confidence < promise["confidence"]
        assert feedback.caveats
