from datetime import timedelta
from pathlib import Path

from fastapi import FastAPI
from httpx import AsyncClient

from app.db.database import Database
from app.db.models import NotificationRow, RoomType
from app.domain.catalog import hotel_id
from app.service.ports import RecordingEventBus
from tests.factories import FakeClock
from tests.integration.test_partner_api import login_partner
from tests.integration.test_partner_questions import MAYAK, partner_world

FOREIGN = hotel_id("way/2")


async def test_partner_decision_updates_guest_booking_and_notification(
    client: AsyncClient, app: FastAPI, db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    clock = FakeClock()
    app.state.clock = clock
    events = RecordingEventBus()
    app.state.events = events
    async with db.unit_of_work() as uow:
        uow.session.add_all(
            [
                RoomType(
                    id=key,
                    hotel_id=hotel,
                    name=key,
                    area=25,
                    bed="double",
                    capacity=2,
                    rates=[{"id": "flex", "price": 5000}],
                )
                for key, hotel in (("suite", MAYAK), ("other", FOREIGN))
            ]
        )
        uow.session.add_all(
            [
                NotificationRow(
                    audience="hotel", hotel_id=MAYAK, kind="test", title="Для отеля", body="ok"
                ),
                NotificationRow(
                    audience="guest",
                    hotel_id=MAYAK,
                    kind="test",
                    title="Скрытая гостевая",
                    body="hidden",
                ),
            ]
        )
    guest_login = await client.post(
        "/api/v1/auth/demo", json={"persona": "guest_anna"}, headers={"X-Client": "mobile"}
    )
    guest = {"Authorization": f"Bearer {guest_login.json()['access_token']}"}
    bookings = []
    for key, hotel in (("suite", MAYAK), ("other", FOREIGN)):
        response = await client.post(
            "/api/v1/bookings",
            headers=guest,
            json={
                "hotelId": str(hotel),
                "roomTypeId": key,
                "ratePlanId": "flex",
                "checkIn": (clock.now().date() + timedelta(days=1)).isoformat(),
                "checkOut": (clock.now().date() + timedelta(days=3)).isoformat(),
                "guests": {"adults": 2},
            },
        )
        assert response.status_code == 201, response.text
        bookings.append(response.json())
    headers = await login_partner(client)
    owned, foreign = bookings
    response = await client.get(f"/api/v1/partner/hotels/{MAYAK}/requests", headers=headers)
    assert [b["id"] for b in response.json()] == [owned["id"]]
    for booking, code in ((foreign, 403), (owned, 200), (owned, 409)):
        response = await client.post(
            f"/api/v1/partner/requests/{booking['id']}/decision",
            headers=headers,
            json={"status": "confirmed", "reply": "Подтверждаем запрос"},
        )
        assert response.status_code == code, response.text
    trip = await client.get(f"/api/v1/trips/{owned['id']}", headers=guest)
    assert trip.status_code == 200, trip.text
    assert trip.json()["booking"]["status"] == "confirmed"
    notifications = (await client.get("/api/v1/me/notifications", headers=guest)).json()
    assert any(n["kind"] == "booking.status" for n in notifications)
    notifications = (
        await client.get(f"/api/v1/partner/hotels/{MAYAK}/notifications", headers=headers)
    ).json()
    assert [n["title"] for n in notifications] == ["Для отеля"]

    status_events = [event for channel, event in events.published if channel.startswith("user:")]
    assert len(status_events) == 1
    assert status_events[0]["bookingId"] == owned["id"]
    assert status_events[0]["status"] == "confirmed"
