from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from pathlib import Path
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy import text

from app.core.config import Settings
from app.db import models  # noqa: F401 - registers every table
from app.db.base import Base
from app.db.database import Database
from app.main import create_app
from tests.conftest import TEST_DATABASE_URL, build_settings
from tests.factories import Account, promote, register

BACKEND_DIR = Path(__file__).resolve().parents[2]
TABLES = tuple(table.name for table in Base.metadata.sorted_tables)


def alembic_config(database_url: str = TEST_DATABASE_URL) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["database_url"] = database_url
    config.attributes["configure_logger"] = False
    return config


@pytest.fixture(scope="session", autouse=True)
def _migrated_database() -> None:
    """Schema comes from the real migrations, so tests also prove the migrations work."""
    command.upgrade(alembic_config(), "head")


async def _reset_state() -> None:
    # Always the default test services, even when a test overrides URLs to simulate an outage.
    settings = build_settings()
    db = Database(settings)
    try:
        async with db.raw_session() as session:
            await session.execute(text(f"TRUNCATE {', '.join(TABLES)} CASCADE"))
            await session.commit()
    finally:
        await db.dispose()
    redis = Redis.from_url(settings.redis_url)
    try:
        await redis.flushdb()
    finally:
        await redis.aclose()


@asynccontextmanager
async def running_app(settings: Settings) -> AsyncIterator[tuple[FastAPI, AsyncClient]]:
    """Clean database and Redis, then the real app with its lifespan, plus an in-process client."""
    await _reset_state()
    app = create_app(settings)
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield app, client


AppFactory = Callable[..., AbstractAsyncContextManager[tuple[FastAPI, AsyncClient]]]


@pytest.fixture
def app_factory() -> AppFactory:
    """For tests that need non-default settings: `async with app_factory(x=1) as (app, client)`."""

    def factory(**overrides: Any) -> AbstractAsyncContextManager[tuple[FastAPI, AsyncClient]]:
        return running_app(build_settings(**overrides))

    return factory


@pytest.fixture
async def _running(settings: Settings) -> AsyncIterator[tuple[FastAPI, AsyncClient]]:
    async with running_app(settings) as pair:
        yield pair


@pytest.fixture
def app(_running: tuple[FastAPI, AsyncClient]) -> FastAPI:
    return _running[0]


@pytest.fixture
def client(_running: tuple[FastAPI, AsyncClient]) -> AsyncClient:
    """httpx client talking to the app in-process (no network, lifespan already running)."""
    return _running[1]


@pytest.fixture
def db(app: FastAPI) -> Database:
    """The app's own Database: assert on rows or run the worker code directly."""
    database: Database = app.state.db
    return database


@pytest.fixture
async def user(client: AsyncClient) -> Account:
    return await register(client)


@pytest.fixture
async def operator(client: AsyncClient, db: Database) -> Account:
    account = await register(client, email="operator@example.com")
    await promote(db, account.email)
    return account
