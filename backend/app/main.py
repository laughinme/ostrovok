from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from app.api.middleware import RequestContextMiddleware
from app.api.problems import register_exception_handlers
from app.api.router import api_router
from app.api.system import health_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.security.tokens import TokenCodec
from app.db.database import Database


def create_app(settings: Settings | None = None) -> FastAPI:
    """
    App factory: `uvicorn app.main:create_app --factory`.
    Tests call it with their own settings; nothing is created at import time.
    """
    settings = settings or get_settings()
    configure_logging(settings.log_level, as_json=settings.log_json)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.db = Database(settings)
        app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True)
        try:
            yield
        finally:
            await app.state.redis.aclose()
            await app.state.db.dispose()

    docs = settings.show_api_docs
    app = FastAPI(
        title="О!кно API",
        lifespan=lifespan,
        debug=settings.debug,
        docs_url="/api/docs" if docs else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if docs else None,
    )
    app.state.settings = settings
    app.state.token_codec = TokenCodec.from_settings(settings)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    # Added last = outermost: every response, including CORS preflights and errors, gets an id.
    app.add_middleware(RequestContextMiddleware)
    register_exception_handlers(app, debug=settings.debug)
    app.include_router(health_router)
    app.include_router(api_router)
    return app
