from collections.abc import AsyncIterator, Awaitable, Callable
from datetime import timedelta
from typing import Annotated, Literal

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis

from app.core.config import Settings
from app.core.errors import ForbiddenError, RateLimitedError, UnauthorizedError
from app.core.security.tokens import TokenCodec
from app.db.database import Database
from app.db.uow import UnitOfWork
from app.domain.auth import ClientKind
from app.domain.users import CurrentUser, Permission
from app.infra.rate_limit import RateLimiter
from app.service.accounts import AccountService
from app.service.agents.runs import RunQueries, RunStream
from app.service.auth import AuthService, resolve_current_user
from app.service.catalog.hotels import HotelQueries
from app.service.knowledge.facts import FactQueries
from app.service.knowledge.registry import Registry
from app.service.ports import Clock, EventBus
from app.service.search.intents import IntentParser
from app.service.search.search import SearchService

# Everything long-lived is created once in the app factory and read from app.state here,
# so tests can build an app with their own settings and fakes.


def _settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def _database(request: Request) -> Database:
    database: Database = request.app.state.db
    return database


def _redis(request: Request) -> Redis:
    redis: Redis = request.app.state.redis
    return redis


def _codec(request: Request) -> TokenCodec:
    codec: TokenCodec = request.app.state.token_codec
    return codec


SettingsDep = Annotated[Settings, Depends(_settings)]
DatabaseDep = Annotated[Database, Depends(_database)]
RedisDep = Annotated[Redis, Depends(_redis)]
CodecDep = Annotated[TokenCodec, Depends(_codec)]


async def _unit_of_work(db: DatabaseDep) -> AsyncIterator[UnitOfWork]:
    async with db.unit_of_work() as uow:
        yield uow


# scope="function": the commit runs before the response is sent, so a failed commit
# becomes a 500 instead of a 200 for data that was never saved.
UowDep = Annotated[UnitOfWork, Depends(_unit_of_work, scope="function")]

_bearer = HTTPBearer(auto_error=False, description="Access token from /auth/login or /auth/refresh")


async def current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    codec: CodecDep,
    uow: UowDep,
) -> CurrentUser:
    if creds is None:
        raise UnauthorizedError()
    return await resolve_current_user(uow, codec.decode_access(creds.credentials))


CurrentUserDep = Annotated[CurrentUser, Depends(current_user)]


def require(permission: Permission) -> Callable[[CurrentUser], Awaitable[CurrentUser]]:
    async def dependency(user: CurrentUserDep) -> CurrentUser:
        if not user.can(permission):
            raise ForbiddenError()
        return user

    return dependency


def rate_limit(bucket: str) -> Callable[[Request, RedisDep, SettingsDep], Awaitable[None]]:
    """Per client IP. Behind a proxy run uvicorn with --proxy-headers so the IP is the real one."""

    async def dependency(request: Request, redis: RedisDep, settings: SettingsDep) -> None:
        if not settings.rate_limit_enabled:
            return
        limiter = RateLimiter(redis, limit=settings.auth_rate_limit_per_minute, window_sec=60)
        client = request.client.host if request.client else "unknown"
        if not await limiter.hit(f"{bucket}:{client}"):
            raise RateLimitedError()

    return dependency


def _client_kind(
    x_client: Annotated[Literal["web", "mobile"], Header(alias="X-Client")] = "web",
) -> ClientKind:
    return ClientKind(x_client)


ClientDep = Annotated[ClientKind, Depends(_client_kind)]
UserAgentDep = Annotated[str | None, Header(alias="User-Agent", include_in_schema=False)]


def _auth_service(uow: UowDep, codec: CodecDep, settings: SettingsDep) -> AuthService:
    return AuthService(uow, codec, refresh_ttl=timedelta(seconds=settings.refresh_ttl))


AuthServiceDep = Annotated[AuthService, Depends(_auth_service)]


def _account_service(uow: UowDep) -> AccountService:
    return AccountService(uow)


AccountServiceDep = Annotated[AccountService, Depends(_account_service)]


def _hotel_queries(uow: UowDep) -> HotelQueries:
    return HotelQueries(uow)


def _fact_queries(uow: UowDep) -> FactQueries:
    return FactQueries(uow)


def _registry(uow: UowDep) -> Registry:
    return Registry(uow)


HotelQueriesDep = Annotated[HotelQueries, Depends(_hotel_queries)]
FactQueriesDep = Annotated[FactQueries, Depends(_fact_queries)]
RegistryDep = Annotated[Registry, Depends(_registry)]


def _events(request: Request) -> EventBus:
    events: EventBus = request.app.state.events
    return events


EventsDep = Annotated[EventBus, Depends(_events)]


def _run_queries(db: DatabaseDep) -> RunQueries:
    return RunQueries(db)


def _run_stream(db: DatabaseDep, events: EventsDep) -> RunStream:
    return RunStream(db, events)


RunQueriesDep = Annotated[RunQueries, Depends(_run_queries)]
RunStreamDep = Annotated[RunStream, Depends(_run_stream)]


def _clock(request: Request) -> Clock:
    clock: Clock = request.app.state.clock
    return clock


ClockDep = Annotated[Clock, Depends(_clock)]


def _intent_parser(uow: UowDep, settings: SettingsDep) -> IntentParser:
    return IntentParser(uow, settings.data_dir)


def _search_service(uow: UowDep, clock: ClockDep) -> SearchService:
    return SearchService(uow, clock)


IntentParserDep = Annotated[IntentParser, Depends(_intent_parser)]
SearchServiceDep = Annotated[SearchService, Depends(_search_service)]
