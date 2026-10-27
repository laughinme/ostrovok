import asyncio

from httpx import AsyncClient

from tests.factories import DEFAULT_PASSWORD, Account, login, register
from tests.integration.conftest import AppFactory

REFRESH = "/api/v1/auth/refresh"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_mobile_register_login_refresh_logout(client: AsyncClient) -> None:
    account = await register(client, email="Mixed.Case@Example.com", username="neo")

    me = await client.get("/api/v1/me", headers=account.headers)
    assert me.json()["email"] == "mixed.case@example.com"
    assert me.json()["username"] == "neo"

    session = await login(client, "mixed.case@example.com")
    assert session.refresh_token

    refreshed = await client.post(REFRESH, headers=bearer(session.refresh_token))
    assert refreshed.status_code == 200
    new_refresh = refreshed.json()["refresh_token"]
    assert new_refresh != session.refresh_token

    logout = await client.post("/api/v1/auth/logout", headers=bearer(new_refresh))
    assert logout.status_code == 204
    after_logout = await client.post(REFRESH, headers=bearer(new_refresh))
    assert after_logout.status_code == 401
    assert after_logout.json()["error_code"] == "SESSION_REVOKED"


async def test_web_client_gets_cookies_and_must_send_csrf(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "web@example.com", "password": DEFAULT_PASSWORD},
        headers={"X-Client": "web"},
    )
    assert response.status_code == 201
    assert response.json()["refresh_token"] is None
    csrf = client.cookies["csrf_token"]
    assert client.cookies["refresh_token"]

    without_csrf = await client.post(REFRESH)
    assert without_csrf.status_code == 403
    assert without_csrf.json()["error_code"] == "CSRF_FAILED"

    with_csrf = await client.post(REFRESH, headers={"X-CSRF-Token": csrf})
    assert with_csrf.status_code == 200
    assert with_csrf.json()["access_token"]
    assert client.cookies["csrf_token"] != csrf


async def test_reused_refresh_token_kills_the_session(user: Account, client: AsyncClient) -> None:
    assert user.refresh_token
    first = await client.post(REFRESH, headers=bearer(user.refresh_token))
    rotated = first.json()["refresh_token"]

    replay = await client.post(REFRESH, headers=bearer(user.refresh_token))
    assert replay.status_code == 401
    assert replay.json()["error_code"] == "REFRESH_TOKEN_REUSED"

    # The legitimate holder is logged out too: we can't tell who the thief was.
    legit = await client.post(REFRESH, headers=bearer(rotated))
    assert legit.status_code == 401


async def test_logout_all_invalidates_existing_access_tokens(
    user: Account, client: AsyncClient
) -> None:
    other_device = await login(client, user.email)

    response = await client.post("/api/v1/auth/logout-all", headers=user.headers)
    assert response.status_code == 204

    for account in (user, other_device):
        me = await client.get("/api/v1/me", headers=account.headers)
        assert me.status_code == 401
        assert me.json()["error_code"] == "SESSION_REVOKED"


async def test_wrong_password_and_unknown_email_look_the_same(
    user: Account, client: AsyncClient
) -> None:
    wrong_password = await client.post(
        "/api/v1/auth/login", json={"email": user.email, "password": "nope-nope-nope"}
    )
    unknown_email = await client.post(
        "/api/v1/auth/login", json={"email": "ghost@example.com", "password": "nope-nope-nope"}
    )

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json()["error_code"] == unknown_email.json()["error_code"]


async def test_duplicate_email_is_a_conflict(user: Account, client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": user.email.upper(), "password": DEFAULT_PASSWORD},
    )

    assert response.status_code == 409
    assert response.json()["error_code"] == "EMAIL_TAKEN"


async def test_garbage_access_token_is_401(client: AsyncClient) -> None:
    response = await client.get("/api/v1/me", headers=bearer("not-a-jwt"))

    assert response.status_code == 401
    assert response.json()["error_code"] == "INVALID_TOKEN"


async def test_login_is_rate_limited(app_factory: AppFactory) -> None:
    async with app_factory(rate_limit_enabled=True, auth_rate_limit_per_minute=2) as (_, client):
        body = {"email": "ghost@example.com", "password": "whatever-123"}
        statuses = [
            (await client.post("/api/v1/auth/login", json=body)).status_code for _ in range(3)
        ]

    assert statuses == [401, 401, 429]


async def test_parallel_refreshes_with_one_token_cannot_both_win(
    user: Account, client: AsyncClient
) -> None:
    assert user.refresh_token
    responses = await asyncio.gather(
        client.post(REFRESH, headers=bearer(user.refresh_token)),
        client.post(REFRESH, headers=bearer(user.refresh_token)),
    )

    assert sorted(response.status_code for response in responses) == [200, 401]
