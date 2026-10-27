from collections.abc import Callable
from datetime import datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app
from tests.integration.conftest import AppFactory

PROBLEM_KEYS = {"type", "title", "status", "detail", "error_code", "instance", "timestamp"}


def assert_problem(response_json: dict[str, object], status: int) -> None:
    assert response_json.keys() >= PROBLEM_KEYS
    assert response_json["status"] == status
    datetime.fromisoformat(str(response_json["timestamp"]))


async def test_validation_error_is_a_problem(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/register", json={"email": "nope", "password": "x"})

    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    assert_problem(response.json(), 422)
    assert {error["loc"][-1] for error in response.json()["details"]} == {"email", "password"}


@pytest.mark.parametrize(
    ("method", "path", "status"),
    [("GET", "/api/v1/nope", 404), ("DELETE", "/api/health", 405)],
)
async def test_framework_errors_are_problems(
    client: AsyncClient, method: str, path: str, status: int
) -> None:
    response = await client.request(method, path)

    assert response.status_code == status
    assert_problem(response.json(), status)
    assert response.json()["error_code"] == "HTTP_ERROR"


async def test_request_id_is_propagated(client: AsyncClient) -> None:
    response = await client.get("/api/v1/me", headers={"X-Request-ID": "trace-123"})

    assert response.headers["X-Request-ID"] == "trace-123"
    assert response.json()["request_id"] == "trace-123"


async def test_unsafe_request_id_is_replaced(client: AsyncClient) -> None:
    response = await client.get("/api/health", headers={"X-Request-ID": "bad id\nwith newline"})

    assert response.headers["X-Request-ID"] != "bad id\nwith newline"


async def test_health_and_ready(client: AsyncClient) -> None:
    health = await client.get("/api/health")
    ready = await client.get("/api/ready")

    assert health.json() == {"status": "ok"}
    assert ready.status_code == 200
    assert ready.json()["checks"] == {"database": "ok", "redis": "ok"}


async def test_ready_reports_a_broken_dependency(app_factory: AppFactory) -> None:
    async with app_factory(redis_url="redis://localhost:1/0") as (_, client):
        ready = await client.get("/api/ready")

    assert ready.status_code == 503
    assert ready.json()["checks"]["redis"] == "error"


async def test_docs_are_hidden_in_production_like_setups(app_factory: AppFactory) -> None:
    async with app_factory(api_docs_enabled=False) as (_, client):
        assert (await client.get("/api/docs")).status_code == 404


async def test_unexpected_error_is_a_500_problem_without_internals(
    make_settings: Callable[..., Settings],
) -> None:
    app = create_app(make_settings(debug=False))

    async def explode() -> None:
        raise RuntimeError("database password is hunter2")

    app.add_api_route("/api/explode", explode)
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/explode", headers={"X-Request-ID": "boom-1"})

    assert response.status_code == 500
    assert response.json()["error_code"] == "INTERNAL_ERROR"
    assert response.json()["detail"] == "Internal server error"
    assert response.json()["request_id"] == "boom-1"
