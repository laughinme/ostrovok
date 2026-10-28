from pathlib import Path

from httpx import AsyncClient
from sqlalchemy import func, select

from app.db.database import Database
from app.db.models import UserEventRow
from app.service.search.history_seed import DemoHistoryLoader
from tests.integration.test_search_api import DATA, _world


async def anna_headers(client: AsyncClient) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/demo", json={"persona": "guest_anna"}, headers={"X-Client": "mobile"}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def test_profile_changes_ranking_and_can_be_disabled_patched_and_reset(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
) -> None:
    await _world(db, tmp_path)
    async with db.unit_of_work() as uow:
        await DemoHistoryLoader().load(uow, DATA)
        await DemoHistoryLoader().load(uow, DATA)
        count = await uow.session.scalar(select(func.count()).select_from(UserEventRow))
        assert count == 9
    headers = await anna_headers(client)
    profile = (await client.get("/api/v1/me/taste", headers=headers)).json()
    assert profile["enabled"]
    assert "Тишина важнее вида" in profile["summary"]
    assert any("2 из 2" in w["because"] for w in profile["weights"])
    query = {"text": "Вид на море"}
    plain = (
        await client.post("/api/v1/searches", json=query | {"useProfile": False}, headers=headers)
    ).json()
    personal = (await client.post("/api/v1/searches", json=query, headers=headers)).json()
    assert plain["matches"][0]["name"] == "Маяк"
    assert personal["matches"][0]["name"] == "Тихий двор"
    assert any(c["fromProfile"] for c in personal["intent"]["chips"])
    response = await client.patch("/api/v1/me/taste", headers=headers, json={"enabled": False})
    assert response.status_code == 200
    reread = (await client.get(f"/api/v1/searches/{personal['searchId']}")).json()
    assert reread["matches"][0]["name"] == "Маяк"
    changed = await client.patch(
        "/api/v1/me/taste",
        headers=headers,
        json={"enabled": True, "weights": [{"characteristic": "night_noise", "weight": 2.7}]},
    )
    assert changed.status_code == 200, changed.text
    assert any(w["weight"] == 2.7 for w in changed.json()["weights"])
    assert (await client.delete("/api/v1/me/taste", headers=headers)).status_code == 204
    reset = (await client.get("/api/v1/me/taste", headers=headers)).json()
    assert reset == {"enabled": False, "summary": [], "weights": []}


async def test_profile_requires_guest_and_validates_characteristics(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/me/taste")).status_code == 401
