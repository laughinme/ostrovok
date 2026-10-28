from dataclasses import replace
from pathlib import Path

from httpx import AsyncClient

from app.db.database import Database
from app.db.models import Hotel, RoomType
from app.domain.knowledge.scope import Scope
from app.service.knowledge.recorder import KnowledgeStore
from tests.factories import FakeClock
from tests.integration.test_search_api import MAYAK, YARD, _obs, _world


def selections() -> list[dict[str, str]]:
    return [{"hotelId": str(MAYAK)}, {"hotelId": str(YARD)}]


async def test_compare_matrix_and_summary_use_the_same_search_facts(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
) -> None:
    await _world(db, tmp_path)
    chips = (
        await client.post("/api/v1/intents", json={"text": "Тишина ночью и вид на море"})
    ).json()["chips"]
    response = await client.post(
        "/api/v1/compare", json={"selections": selections(), "chips": chips}
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert len(result["matches"]) == 2
    assert len(result["rows"]) == 2
    assert all(len(row["results"]) == 2 for row in result["rows"])
    assert "Маяк" in result["summary"]
    assert "Тихий двор" in result["summary"]
    assert all(r["factId"] for row in result["rows"] for r in row["results"])


async def test_compare_rejects_duplicate_and_impossible_variants(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
) -> None:
    await _world(db, tmp_path)
    duplicate = await client.post("/api/v1/compare", json={"selections": [selections()[0]] * 2})
    assert duplicate.status_code == 400
    impossible = await client.post(
        "/api/v1/compare",
        json={
            "selections": [
                {"hotelId": str(MAYAK), "floor": 100},
                selections()[1],
            ]
        },
    )
    assert impossible.status_code == 400


async def test_similar_quieter_really_improves_quiet_probability(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
) -> None:
    await _world(db, tmp_path)
    response = await client.post(f"/api/v1/hotels/{MAYAK}/similar", json={"change": "quieter"})
    assert response.status_code == 200, response.text
    assert response.json()["matches"][0]["hotelId"] == str(YARD)
    reverse = await client.post(f"/api/v1/hotels/{YARD}/similar", json={"change": "quieter"})
    assert reverse.json()["matches"] == []
    assert reverse.json()["caveats"]


async def test_similar_cheaper_and_beach_improvements_use_actual_values(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
) -> None:

    await _world(db, tmp_path)
    async with db.unit_of_work() as uow:
        for hotel_id, price in [(MAYAK, 7000), (YARD, 5000)]:
            hotel = await uow.session.get(Hotel, hotel_id)
            assert hotel is not None
            hotel.price_from_demo = price
        await KnowledgeStore(uow, FakeClock()).record(
            [
                replace(
                    _obs(MAYAK, "beach_walk", Scope.everywhere(), True, 0.9), value={"minutes": 18}
                ),
                replace(
                    _obs(YARD, "beach_walk", Scope.everywhere(), True, 0.9), value={"minutes": 7}
                ),
            ],
            reason="test",
        )
    for change in ("cheaper", "closer_to_beach"):
        response = await client.post(f"/api/v1/hotels/{MAYAK}/similar", json={"change": change})
        assert response.status_code == 200, response.text
        assert response.json()["matches"][0]["hotelId"] == str(YARD)
        reverse = await client.post(f"/api/v1/hotels/{YARD}/similar", json={"change": change})
        assert reverse.json()["matches"] == []


async def test_compare_two_unmapped_room_categories_of_one_hotel(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
) -> None:
    await _world(db, tmp_path)
    async with db.unit_of_work() as uow:
        for name in ("suite", "standard"):
            uow.session.add(
                RoomType(
                    id=name,
                    hotel_id=MAYAK,
                    name=name,
                    area=25,
                    bed="double",
                    capacity=2,
                    rates=[{"id": name, "price": 5000}],
                )
            )
    response = await client.post(
        "/api/v1/compare",
        json={
            "selections": [
                {"hotelId": str(MAYAK), "roomTypeId": "suite"},
                {"hotelId": str(MAYAK), "roomTypeId": "standard"},
            ]
        },
    )
    assert response.status_code == 200, response.text
    assert [m["recommendation"]["roomTypeId"] for m in response.json()["matches"]] == [
        "suite",
        "standard",
    ]
    assert all(not m["recommendation"]["confirmedByHotel"] for m in response.json()["matches"])
