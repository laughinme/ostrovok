from pathlib import Path

from httpx import AsyncClient
from sqlalchemy import func, select

from app.db.database import Database
from app.db.models import Hotel, HotelStaff
from app.domain.catalog import hotel_id
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders
from tests.seed_data import write_region


async def test_seed_is_idempotent_and_derives_facades(db: Database, tmp_path: Path) -> None:
    data_dir = write_region(tmp_path)

    first = await run_seed(db, data_dir, seed_loaders())
    second = await run_seed(db, data_dir, seed_loaders())

    assert first == ["hotels", "demo_users"]
    assert second == []
    async with db.raw_session() as session:
        mayak = await session.get(Hotel, hotel_id("way/1"))
        staff = await session.scalar(select(func.count()).select_from(HotelStaff))
    assert mayak is not None
    assert mayak.floors == 9
    assert sorted(mayak.facades) == ["E", "N", "S", "W"]
    assert staff == 1


async def test_demo_personas_sign_in_with_their_roles(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await run_seed(db, write_region(tmp_path), seed_loaders())

    for persona, role in [("guest_anna", "guest"), ("hotelier_mayak", "hotelier")]:
        response = await client.post(
            "/api/v1/auth/demo", json={"persona": persona}, headers={"X-Client": "mobile"}
        )
        assert response.status_code == 200, response.text
        token = response.json()["access_token"]
        me = await client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
        assert me.json()["role"] == role

    unknown = await client.post("/api/v1/auth/demo", json={"persona": "nobody"})
    assert unknown.status_code == 404
    assert unknown.json()["error_code"] == "UNKNOWN_PERSONA"
