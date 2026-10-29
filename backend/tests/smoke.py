# ruff: noqa: T201

import sys
import time

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"


def check(label: str, response: httpx.Response, status: int = 200) -> dict | list:  # type: ignore[type-arg]
    ok = response.status_code == status
    took = response.elapsed.total_seconds() * 1000
    print(f"{'ok  ' if ok else 'FAIL'} {label}: {response.status_code} {took:.0f} ms")
    if not ok:
        print(response.text[:500])
        sys.exit(1)
    return response.json() if "json" in response.headers.get("content-type", "") else {}


def main() -> None:
    started = time.perf_counter()
    with httpx.Client(base_url=BASE, timeout=30) as http:
        assert check("/health", http.get("/health")) == {"status": "ok"}
        if "--api-only" not in sys.argv:
            check("frontend /", http.get("/"))
        check("OpenAPI", http.get("/api/openapi.json"))
        hotels = check("hotels", http.get("/api/v1/hotels"))
        assert isinstance(hotels, list)
        assert len(hotels) >= 100, len(hotels)
        with_facts = sum(1 for h in hotels if h["facts"])
        print(f"     {len(hotels)} hotels, {with_facts} with facts")
        result = check(
            "search",
            http.post(
                "/api/v1/searches",
                json={"text": "Тихий номер с видом на море, вдвоём 12-15 ноября"},
            ),
            201,
        )
        top = result["matches"][0]
        print(f"     top: {top['name']} · {top['score']:.2f} · {top['recommendation']['request']}")
        hotel = check("hotel page", http.get(f"/api/v1/hotels/{top['hotelId']}"))
        fact = hotel["facts"][0]
        check("why we think so", http.get(f"/api/v1/facts/{fact['id']}"))
        check("characteristics", http.get("/api/v1/characteristics"))
        check("moods", http.get("/api/v1/moods?month=11"))
        base = f"/api/v1/hotels/{top['hotelId']}"
        check("window", http.get(base + "/window?facade=W&floor=3&date=2026-11-12"))
        check("noise", http.get(base + "/noise"))
        check("beach route", http.get(base + "/routes/beach"))
        check("climate", http.get(base + "/climate?from=2026-11-12&to=2026-11-15"))
        check("day", http.get(base + "/day?date=2026-11-12"))
        token = check(
            "demo operator",
            http.post(
                "/api/v1/auth/demo", json={"persona": "operator"}, headers={"X-Client": "mobile"}
            ),
        )["access_token"]
        auth = {"Authorization": f"Bearer {token}"}
        check("console registry", http.get("/api/v1/console/registry", headers=auth))
        check("console runs", http.get("/api/v1/console/runs?limit=5", headers=auth))
        check("LLM journal", http.get("/api/v1/console/llm/calls?limit=1", headers=auth))
        check("LLM usage", http.get("/api/v1/console/llm/usage", headers=auth))
        mcp = http.post(
            "/mcp",
            headers={"Accept": "application/json, text/event-stream", "Host": "localhost:8080"},
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {"name": "smoke", "version": "1"},
                },
            },
        )
        assert "result" in check("MCP", mcp)
    print(f"smoke passed in {time.perf_counter() - started:.1f} s")


if __name__ == "__main__":
    main()
