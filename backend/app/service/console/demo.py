"""Back to the seeded demo between takes of the video (09 §9 `/console/demo/reset`)."""

from pathlib import Path

from sqlalchemy import delete, text

from app.db.models import Building, CharacteristicRow, Hotel
from app.db.uow import UnitOfWork
from app.service.knowledge.registry import RegistryLoader
from app.service.seed_export import KnowledgeSeedLoader

# Everything guests, hotels and the operator create while the demo runs.
RUNTIME_TABLES = (
    "trip_feedback",
    "bookings",
    "hotelier_answers",
    "hotelier_questions",
    "notifications",
    "searches",
    "demand_daily",
    "world_changes",
    "jobs",
)


class DemoReset:
    def __init__(self, uow: UnitOfWork, data_dir: Path) -> None:
        self._uow = uow
        self._data_dir = data_dir

    async def reset(self) -> str:
        session = self._uow.session
        for table in RUNTIME_TABLES:
            await session.execute(text(f"DELETE FROM {table}"))  # noqa: S608 - fixed names
        await session.execute(delete(Hotel).where(Hotel.demo["onboarded"].as_boolean().is_(True)))
        await session.execute(delete(Building).where(Building.added_by != "osm"))
        await session.execute(
            delete(CharacteristicRow).where(CharacteristicRow.status != "published")
        )
        await RegistryLoader().load(self._uow, self._data_dir)
        knowledge = KnowledgeSeedLoader()
        if all(p.exists() for p in knowledge.sources(self._data_dir)):
            return await knowledge.load(self._uow, self._data_dir)
        for table in (
            "fact_versions",
            "facts",
            "conflicts",
            "observations",
            "agent_steps",
            "agent_runs",
        ):
            await session.execute(text(f"DELETE FROM {table}"))  # noqa: S608 - fixed names
        return "seed has no knowledge yet: knowledge cleared"
