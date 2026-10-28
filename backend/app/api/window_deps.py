from typing import Annotated

from fastapi import Depends, Request

from app.api.deps import DatabaseDep, SettingsDep
from app.bootstrap import build_view_environment
from app.service.geo.window import WindowQueries
from app.service.ports import SystemClock


def window_queries(request: Request, db: DatabaseDep, settings: SettingsDep) -> WindowQueries:
    if not hasattr(request.app.state, "window_queries"):
        env = build_view_environment(db, SystemClock(), settings.data_dir)
        request.app.state.window_queries = WindowQueries(db, env)
    queries: WindowQueries = request.app.state.window_queries
    return queries


WindowQueriesDep = Annotated[WindowQueries, Depends(window_queries)]
