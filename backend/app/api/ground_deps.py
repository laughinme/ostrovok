from threading import Lock
from typing import Annotated

from fastapi import Depends, Request

from app.api.deps import DatabaseDep, SettingsDep
from app.bootstrap import build_environment
from app.service.geo.ground import GroundQueries
from app.service.ports import SystemClock

_ENVIRONMENT_LOCK = Lock()


def ground_queries(request: Request, db: DatabaseDep, settings: SettingsDep) -> GroundQueries:
    # A sync dependency runs in FastAPI's thread pool; loading the graph does not block the loop.
    with _ENVIRONMENT_LOCK:
        if not hasattr(request.app.state, "ground_queries"):
            env = build_environment(db, SystemClock(), settings.data_dir)
            request.app.state.ground_queries = GroundQueries(db, env)
    queries: GroundQueries = request.app.state.ground_queries
    return queries


GroundQueriesDep = Annotated[GroundQueries, Depends(ground_queries)]
