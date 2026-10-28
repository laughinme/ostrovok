from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from itertools import count
from typing import Any

from httpx import AsyncClient
from sqlalchemy import update

from app.db.database import Database
from app.db.models import User
from app.domain.users import Role

DEFAULT_PASSWORD = "correct-horse-42"
_sequence = count(1)


@dataclass(frozen=True)
class Account:
    id: str
    email: str
    password: str
    access_token: str
    refresh_token: str | None

    @property
    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}


def unique_email(prefix: str = "user") -> str:
    return f"{prefix}{next(_sequence)}@example.com"


async def register(
    client: AsyncClient,
    *,
    email: str | None = None,
    password: str = DEFAULT_PASSWORD,
    client_kind: str = "mobile",
    **extra: Any,
) -> Account:
    email = email or unique_email()
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, **extra},
        headers={"X-Client": client_kind},
    )
    assert response.status_code == 201, response.text
    tokens = response.json()
    me = await client.get(
        "/api/v1/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    return Account(
        id=me.json()["id"],
        email=email,
        password=password,
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
    )


async def login(client: AsyncClient, email: str, password: str = DEFAULT_PASSWORD) -> Account:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers={"X-Client": "mobile"},
    )
    assert response.status_code == 200, response.text
    tokens = response.json()
    me = await client.get(
        "/api/v1/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    return Account(
        id=me.json()["id"],
        email=email,
        password=password,
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
    )


async def promote(db: Database, email: str, role: Role = Role.OPERATOR) -> None:
    async with db.unit_of_work() as uow:
        await uow.session.execute(update(User).where(User.email == email).values(role=role))


class FakeClock:
    """Time that moves only when a test says so."""

    def __init__(self, now: datetime | None = None) -> None:
        self._now = now or datetime(2026, 11, 12, 12, 0, tzinfo=UTC)

    def now(self) -> datetime:
        return self._now

    def advance(self, delta: timedelta) -> None:
        self._now += delta


class FakeLanguageModel:
    """Scripted LLM for tests: returns `outputs[task]` or raises when told the provider is down."""

    def __init__(self, outputs: dict[str, Any] | None = None, *, down: bool = False) -> None:
        self.outputs = outputs or {}
        self.down = down
        self.calls: list[str] = []

    @property
    def available(self) -> bool:
        return True

    async def structured(self, *, task: str, system: str, prompt: str, output: Any) -> Any:
        from app.service.ports import LlmResult, LlmUnavailableError, Usage  # noqa: PLC0415

        self.calls.append(task)
        if self.down:
            raise LlmUnavailableError("provider down")
        return LlmResult(output.model_validate(self.outputs[task]), Usage(requests=1), "fake")

    async def run_tools(self, *, task: str, output: Any, **_: Any) -> Any:
        return await self.structured(task=task, system="", prompt="", output=output)
