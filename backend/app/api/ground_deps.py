import logging
from threading import Lock
from typing import Annotated

from fastapi import Depends, FastAPI, Request

from app.api.deps import DatabaseDep, RedisDep, SettingsDep
from app.bootstrap import build_environment
from app.core.config import Settings
from app.db.database import Database
from app.infra.geo.geocoder import NominatimGeocoder
from app.service.geo.ground import GroundQueries
from app.service.geo.places import Geocoder
from app.service.ports import SystemClock

logger = logging.getLogger(__name__)

_ENVIRONMENT_LOCK = Lock()


def load_ground(app: FastAPI, db: Database, settings: Settings) -> GroundQueries:
    with _ENVIRONMENT_LOCK:
        if not hasattr(app.state, "ground_queries"):
            env = build_environment(db, SystemClock(), settings.data_dir)
            app.state.ground_queries = GroundQueries(db, env)
    queries: GroundQueries = app.state.ground_queries
    return queries


def warm_ground(app: FastAPI, db: Database, settings: Settings) -> None:
    try:
        load_ground(app, db, settings)
    except Exception:
        logger.exception("ground warm-up failed; the first request will retry")


def ground_queries(request: Request, db: DatabaseDep, settings: SettingsDep) -> GroundQueries:
    # Sync on purpose: FastAPI runs it in the thread pool, so waiting for the warm-up
    # doesn't block the event loop.
    return load_ground(request.app, db, settings)


GroundQueriesDep = Annotated[GroundQueries, Depends(ground_queries)]


def geocoder(redis: RedisDep, settings: SettingsDep) -> Geocoder:
    return NominatimGeocoder(redis, settings.geocoding_url, settings.geocoding_user_agent)


GeocoderDep = Annotated[Geocoder, Depends(geocoder)]
