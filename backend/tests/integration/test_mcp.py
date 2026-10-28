from pathlib import Path
from typing import Any

from httpx import AsyncClient
from sqlalchemy import func, select

from app.db.database import Database
from app.db.models import DemandDaily, SearchRow
from app.domain.knowledge.scope import Facade, Scope
from app.service.knowledge.recorder import KnowledgeStore
from tests.factories import FakeClock
from tests.integration.test_search_api import MAYAK, YARD, _obs, _world

HEADERS = {"Host": "localhost:8080", "Accept": "application/json, text/event-stream"}


async def rpc(
    client: AsyncClient, method: str, params: dict[str, Any] | None = None
) -> dict[str, Any]:
    response = await client.post(
        "/mcp",
        headers=HEADERS,
        json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "error" not in payload, payload
    return payload["result"]


async def test_mcp_lists_readonly_tools_and_finds_november_sunset_without_writes(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
) -> None:
    await _world(db, tmp_path)
    async with db.unit_of_work() as uow:
        await KnowledgeStore(uow, FakeClock()).record(
            [
                _obs(
                    MAYAK,
                    "sunset_over_sea",
                    Scope(facades=frozenset({Facade.S}), floor_from=4, months=frozenset({11})),
                    True,
                    0.9,
                )
            ],
            reason="test",
        )
    initialized = await rpc(
        client,
        "initialize",
        {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "guest-test", "version": "1"},
        },
    )
    assert initialized["serverInfo"]["name"] == "О!кно Hotel Knowledge"
    tools = (await rpc(client, "tools/list"))["tools"]
    assert {t["name"] for t in tools} == {
        "search_hotels",
        "get_hotel_knowledge",
        "explain_fact",
        "compare_hotels",
        "list_characteristics",
    }
    assert all(t["annotations"]["readOnlyHint"] for t in tools)
    found = await rpc(
        client,
        "tools/call",
        {
            "name": "search_hotels",
            "arguments": {"text": "Хочу закат над морем в ноябре", "trip": {"month": 11}},
        },
    )
    assert not found.get("isError"), found
    result = found["structuredContent"]
    assert result["matches"][0]["hotelId"] == str(MAYAK)
    recommendation = result["matches"][0]["recommendation"]
    assert recommendation["scope"]["facades"] == ["S"]
    assert recommendation["scope"]["floorFrom"] >= 4
    fact_id = result["matches"][0]["perChip"][0]["factId"]
    explanation = await rpc(
        client, "tools/call", {"name": "explain_fact", "arguments": {"fact_id": fact_id}}
    )
    assert explanation["structuredContent"]["sources"]
    hotel = await rpc(
        client, "tools/call", {"name": "get_hotel_knowledge", "arguments": {"hotel_id": str(MAYAK)}}
    )
    assert hotel["structuredContent"]["facts"]
    registry = await rpc(client, "tools/call", {"name": "list_characteristics"})
    assert any(c["key"] == "sunset_over_sea" for c in registry["structuredContent"]["items"])
    compared = await rpc(
        client,
        "tools/call",
        {
            "name": "compare_hotels",
            "arguments": {
                "payload": {
                    "selections": [{"hotelId": str(MAYAK)}, {"hotelId": str(YARD)}],
                    "chips": result["intent"]["chips"],
                    "trip": {"month": 11},
                }
            },
        },
    )
    assert len(compared["structuredContent"]["rows"]) == 1
    async with db.unit_of_work() as uow:
        assert await uow.session.scalar(select(func.count()).select_from(SearchRow)) == 0
        assert await uow.session.scalar(select(func.count()).select_from(DemandDaily)) == 0


async def test_mcp_rejects_untrusted_host_but_health_stays_available(client: AsyncClient) -> None:
    response = await client.post(
        "/mcp",
        headers={"Host": "evil.example", "Accept": HEADERS["Accept"]},
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
    )
    assert response.status_code == 421
    assert (await client.get("/health")).status_code == 200
