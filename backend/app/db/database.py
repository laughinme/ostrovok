from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import Settings
from app.core.errors import DomainError
from app.db.uow import UnitOfWork

SESSION_SETTINGS = {
    "tcp_keepalives_idle": "30",
    "tcp_keepalives_interval": "10",
    "tcp_keepalives_count": "3",
    "idle_in_transaction_session_timeout": "600000",
}


class Database:
    def __init__(self, settings: Settings, *, statement_timeout_ms: int | None = None) -> None:
        session = dict(SESSION_SETTINGS)
        if statement_timeout_ms:
            session["statement_timeout"] = str(statement_timeout_ms)
        self.engine: AsyncEngine = create_async_engine(
            settings.database_url,
            echo=settings.sql_echo,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_pre_ping=True,
            connect_args={"server_settings": session},
        )
        self._sessions = async_sessionmaker(self.engine, expire_on_commit=False, autoflush=False)

    @classmethod
    def for_url(cls, database_url: str) -> "Database":
        db = cls.__new__(cls)
        db.engine = create_async_engine(database_url, pool_pre_ping=True)
        db._sessions = async_sessionmaker(db.engine, expire_on_commit=False, autoflush=False)
        return db

    @asynccontextmanager
    async def unit_of_work(self) -> AsyncIterator[UnitOfWork]:
        async with self._sessions() as session:
            try:
                yield UnitOfWork(session)
            except DomainError as exc:
                if exc.keep_changes:
                    await session.commit()
                else:
                    await session.rollback()
                raise
            except BaseException:
                await session.rollback()
                raise
            await session.commit()

    async def ping(self) -> None:
        async with self.engine.connect() as connection:
            await connection.execute(text("SELECT 1"))

    async def dispose(self) -> None:
        await self.engine.dispose()

    def raw_session(self) -> AsyncSession:
        return self._sessions()
