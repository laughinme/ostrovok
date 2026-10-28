import logging
from typing import Annotated

from fastapi import Depends, Request

from app.api.deps import DatabaseDep, SettingsDep
from app.bootstrap import build_view_environment
from app.infra.geo.window_profiles import PROFILE_FILE, WindowProfiles
from app.service.geo.window import WindowQueries
from app.service.ports import SystemClock


def window_queries(request: Request, db: DatabaseDep, settings: SettingsDep) -> WindowQueries:
    if not hasattr(request.app.state, "window_queries"):
        env = build_view_environment(db, SystemClock(), settings.data_dir)
        profiles = None
        region = settings.data_dir / "region"
        if (region / PROFILE_FILE).exists():
            try:
                profiles = WindowProfiles(region)
            except ValueError:
                logging.getLogger(__name__).warning("Stale window profiles: using live geometry")
        request.app.state.window_queries = WindowQueries(db, env, profiles)
    queries: WindowQueries = request.app.state.window_queries
    return queries


WindowQueriesDep = Annotated[WindowQueries, Depends(window_queries)]
