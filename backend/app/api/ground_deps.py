import logging
from threading import Lock
from typing import Annotated

from fastapi import Depends, FastAPI, Request

from app.api.deps import DatabaseDep, SettingsDep
from app.bootstrap import build_environment
from app.core.config import Settings
from app.db.database import Database
from app.service.geo.ground import GroundQueries
from app.service.ports import SystemClock

logger = logging.getLogger(__name__)

_ENVIRONMENT_LOCK = Lock()


def load_ground(app: FastAPI, db: Database, settings: Settings) -> GroundQueries:
    """Loads the walk graph, terrain and climate once; blocking, so call it from a thread."""
    with _ENVIRONMENT_LOCK:
        if not hasattr(app.state, "ground_queries"):
            env = build_environment(db, SystemClock(), settings.data_dir)
            app.state.ground_queries = GroundQueries(db, env)
    queries: GroundQueries = app.state.ground_queries
    return queries


def warm_ground(app: FastAPI, db: Database, settings: Settings) -> None:
    """Startup warm-up: the first guest request should not pay for building the graph."""
    try:
        load_ground(app, db, settings)
    except Exception:
        logger.exception("ground warm-up failed; the first request will retry")


def ground_queries(request: Request, db: DatabaseDep, settings: SettingsDep) -> GroundQueries:
    # A sync dependency runs in the thread pool: waiting for the warm-up never blocks the loop.
    return load_ground(request.app, db, settings)


GroundQueriesDep = Annotated[GroundQueries, Depends(ground_queries)]
