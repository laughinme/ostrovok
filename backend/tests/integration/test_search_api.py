from datetime import timedelta
from pathlib import Path
from uuid import UUID, uuid4

from httpx import AsyncClient

from app.db.database import Database
from app.db.models import AgentRunRow
from app.domain.catalog import hotel_id
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.scope import Facade, Scope
from app.domain.knowledge.sources import SourceKind
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import RegistryLoader
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders
from tests.factories import FakeClock
from tests.seed_data import write_region

DATA = Path(__file__).resolve().parents[2] / "data"
MAYAK, YARD = hotel_id("way/1"), hotel_id("way/2")


def _obs(hotel: object, key: str, scope: Scope, value: bool, conf: float) -> Observation:
    clock = FakeClock()
    return Observation(
        hotel_id=hotel,  # type: ignore[arg-type]
        characteristic=key,
        characteristic_version=1,
        scope=scope,
        value=value,
        confidence=conf,
        source=SourceKind.COMPUTED,
        source_ref=f"method:{key}@1",
        method="test",
        observed_at=clock.now(),
        valid_until=clock.now() + timedelta(days=365),
    )


async def _world(db: Database, tmp_path: Path) -> None:
    await run_seed(db, write_region(tmp_path), seed_loaders())
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, DATA)
        await KnowledgeStore(uow, FakeClock()).record(
            [
                _obs(
                    MAYAK,
                    "sea_view",
                    Scope(facades=frozenset({Facade.S}), floor_from=4),
                    True,
                    0.85,
                ),
                _obs(MAYAK, "night_noise", Scope.everywhere(), False, 0.9),
                _obs(YARD, "night_noise", Scope.everywhere(), True, 0.9),
                _obs(YARD, "sea_view", Scope.everywhere(), False, 0.9),
            ],
            reason="test",
        )


async def test_intent_is_parsed_without_llm(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await _world(db, tmp_path)
    response = await client.post(
        "/api/v1/intents",
        json={"text": "Обязательно тихо ночью, желательно вид на море. Вдвоём с 10 по 14 ноября"},
    )

    intent = response.json()
    by_key = {c["characteristic"]: c for c in intent["chips"]}
    assert intent["planner"] == "rules"
    assert by_key["night_noise"]["importance"] == "must"
    assert by_key["sea_view"]["importance"] == "nice"
    assert intent["trip"]["adults"] == 2
    assert intent["trip"]["from"].endswith("-11-10")


async def test_quiet_courtyard_beats_sea_view_over_the_railway(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await _world(db, tmp_path)

    response = await client.post(
        "/api/v1/searches",
        json={"text": "Обязательно тихо ночью. Желательно вид на море."},
    )

    assert response.status_code == 201, response.text
    result = response.json()
    names = [m["name"] for m in result["matches"]]
    assert names[0] == "Тихий двор"
    mayak = result["matches"][1]
    assert mayak["tradeoff"].startswith("✗ ночью шумно")
    assert mayak["recommendation"]["request"] == "Ю-сторона · этаж ≥ 4"
    again = (await client.get(f"/api/v1/searches/{result['searchId']}")).json()
    assert [m["name"] for m in again["matches"]] == names


async def test_unknown_wish_offers_live_research(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await _world(db, tmp_path)

    result = (
        await client.post(
            "/api/v1/searches",
            json={"text": "Чтобы хинкальная была рядом, минут 10 пешком"},
        )
    ).json()

    chip = result["intent"]["chips"][0]
    assert chip["characteristic"] is None
    assert chip["params"]["maxWalkMinutes"] == 10
    assert result["research"][0]["chipId"] == chip["id"]


async def test_card_asks_one_hotel_about_its_unknown(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await _world(db, tmp_path)
    search = (await client.post("/api/v1/searches", json={"text": "вид на море"})).json()
    url = f"/api/v1/searches/{search['searchId']}/research"

    started = await client.post(
        url, json={"characteristic": "pets_policy", "hotelIds": [str(YARD)]}
    )
    both = await client.post(url, json={"chipId": "c1", "characteristic": "pets_policy"})
    stranger = await client.post(
        url, json={"characteristic": "pets_policy", "hotelIds": [str(uuid4())]}
    )

    assert started.status_code == 202, started.text
    assert both.status_code == 422
    assert stranger.status_code == 404
    chips = (await client.get(f"/api/v1/searches/{search['searchId']}")).json()["intent"]["chips"]
    pets = next(c for c in chips if c["characteristic"] == "pets_policy")
    assert pets["importance"] == "nice"
    async with db.unit_of_work() as uow:
        run = await uow.session.get(AgentRunRow, UUID(started.json()["runId"]))
    assert run is not None
    assert run.subject["hotelIds"] == [str(YARD)]
