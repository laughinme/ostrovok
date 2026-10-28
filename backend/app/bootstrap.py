"""
Long-lived objects for the API, the worker and the CLI, built once from settings.
Data files are optional: an adapter whose file is missing is simply not wired, and the
executors fall back (and say so in the trace).
"""

import gzip
import logging
from dataclasses import dataclass
from pathlib import Path

import shapely.prepared
import shapely.wkb
from redis.asyncio import Redis

from app.core.config import Settings
from app.db.database import Database
from app.infra.geo.area import GraphAreaSlopes
from app.infra.geo.climate import ClimateCatalog
from app.infra.geo.router import ScipyRouter
from app.infra.geo.terrain import NpyTerrain
from app.infra.llm.cache import LlmCache
from app.infra.llm.guards import DailyLimit, ModeSwitch
from app.infra.llm.pydantic_ai_model import PydanticAiLanguageModel, openai_compatible
from app.service.agents.curator import Curator
from app.service.agents.researcher import Researcher
from app.service.agents.runtime import AgentRunner
from app.service.agents.watcher import Watcher
from app.service.agents.wishes import WishResearch
from app.service.geo.scenes import scene_cache
from app.service.ports import Clock, EventBus, LanguageModel
from app.service.recipes.executor import Environment, GeoReader, MethodExecutor, executors_by_method
from app.service.recipes.methods.area_stat import AreaStatExecutor
from app.service.recipes.methods.climate import ClimateExecutor
from app.service.recipes.methods.derived import DerivedExecutor
from app.service.recipes.methods.noise import NoiseExecutor
from app.service.recipes.methods.poi_nearby import PoiNearbyExecutor
from app.service.recipes.methods.sun_event import SunEventExecutor
from app.service.recipes.methods.view import ViewExecutor
from app.service.recipes.methods.walk_to import WalkToExecutor

logger = logging.getLogger(__name__)


def build_environment(db: Database, clock: Clock, data_dir: Path) -> Environment:
    region = data_dir / "region"
    env = build_view_environment(db, clock, data_dir)
    graph = region / "walk_graph.npz"
    if graph.exists():
        env.router = ScipyRouter.from_file(graph)
        env.extras["area_slopes"] = GraphAreaSlopes(env.router.graph)
    else:
        logger.warning("walk graph %s missing: routes fall back to straight lines", graph)
    if (region / "climate.json").exists():
        env.climate = ClimateCatalog.from_file(region / "climate.json")
    return env


def build_view_environment(db: Database, clock: Clock, data_dir: Path) -> Environment:
    region = data_dir / "region"
    env = Environment(reader=GeoReader(db), clock=clock)
    if (region / "dem_int16.npy").exists():
        env.terrain = NpyTerrain(region)
    if (region / "sea.wkb.gz").exists():
        env.sea = shapely.prepared.prep(
            shapely.wkb.loads(gzip.decompress((region / "sea.wkb.gz").read_bytes()))
        )
    return env


def default_executors() -> list[MethodExecutor]:
    return [
        ViewExecutor(),
        SunEventExecutor(),
        AreaStatExecutor(),
        ClimateExecutor(),
        PoiNearbyExecutor(),
        WalkToExecutor(),
        NoiseExecutor(),
        DerivedExecutor(),
    ]


@dataclass(slots=True)
class Agents:
    runner: AgentRunner
    researcher: Researcher
    curator: Curator
    wishes: WishResearch
    watcher: Watcher
    env: Environment


def build_agents(
    db: Database,
    events: EventBus,
    clock: Clock,
    data_dir: Path,
    llm: LanguageModel | None = None,
) -> Agents:
    env = build_environment(db, clock, data_dir)
    executors = dict(executors_by_method(default_executors()))
    runner = AgentRunner(db, events, clock)
    researcher = Researcher(db, env, executors, events)
    curator = Curator(db, env, executors, llm, data_dir)
    return Agents(
        runner=runner,
        researcher=researcher,
        curator=curator,
        wishes=WishResearch(db, runner, researcher, curator, events, clock=clock),
        watcher=Watcher(
            db, runner, researcher, events, invalidate=lambda: scene_cache(env).clear()
        ),
        env=env,
    )


def build_language_model(
    settings: Settings, db: Database, redis: Redis | None
) -> LanguageModel | None:
    """None when there is no key or LLM_MODE=off: every LLM port then runs on rules."""
    if not settings.llm_enabled:
        logger.info("LLM is off (no key or LLM_MODE=off): rule-based planners only")
        return None
    model = openai_compatible(
        settings.llm_base_url, settings.llm_api_key.get_secret_value(), settings.llm_model
    )
    return PydanticAiLanguageModel(
        model,
        model_name=settings.llm_model,
        timeout_sec=settings.llm_timeout_sec,
        limit=DailyLimit(redis, settings.llm_daily_call_limit),
        cache=LlmCache(db),
        switch=ModeSwitch(db),
    )
