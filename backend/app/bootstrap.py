"""
Long-lived objects for the API, the worker and the CLI, built once from settings.
Data files are optional: an adapter whose file is missing is simply not wired, and the
executors fall back (and say so in the trace).
"""

import logging
from dataclasses import dataclass
from pathlib import Path

from app.db.database import Database
from app.infra.geo.climate import ClimateCatalog
from app.infra.geo.router import ScipyRouter
from app.infra.geo.terrain import NpyTerrain
from app.service.agents.researcher import Researcher
from app.service.agents.runtime import AgentRunner
from app.service.ports import Clock, EventBus
from app.service.recipes.executor import Environment, GeoReader, MethodExecutor, executors_by_method
from app.service.recipes.methods.climate import ClimateExecutor
from app.service.recipes.methods.derived import DerivedExecutor
from app.service.recipes.methods.noise import NoiseExecutor
from app.service.recipes.methods.poi_nearby import PoiNearbyExecutor
from app.service.recipes.methods.walk_to import WalkToExecutor

logger = logging.getLogger(__name__)


def build_environment(db: Database, clock: Clock, data_dir: Path) -> Environment:
    region = data_dir / "region"
    env = Environment(reader=GeoReader(db), clock=clock)
    graph = region / "walk_graph.npz"
    if graph.exists():
        env.router = ScipyRouter.from_file(graph)
    else:
        logger.warning("walk graph %s missing: routes fall back to straight lines", graph)
    if (region / "dem_int16.npy").exists():
        env.terrain = NpyTerrain(region)
    if (region / "climate.json").exists():
        env.climate = ClimateCatalog.from_file(region / "climate.json")
    return env


def default_executors() -> list[MethodExecutor]:
    return [
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
    env: Environment


def build_agents(db: Database, events: EventBus, clock: Clock, data_dir: Path) -> Agents:
    env = build_environment(db, clock, data_dir)
    return Agents(
        runner=AgentRunner(db, events, clock),
        researcher=Researcher(db, env, executors_by_method(default_executors()), events),
        env=env,
    )
