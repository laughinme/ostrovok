from app.service.accounts_seed import DemoUsersLoader
from app.service.catalog.seed import (
    BuildingsLoader,
    HotelsLoader,
    OsmFeaturesLoader,
    RoomTypesLoader,
)
from app.service.knowledge.registry import RegistryLoader
from app.service.search.history_seed import DemoHistoryLoader
from app.service.seed import SeedLoader
from app.service.seed_export import KnowledgeSeedLoader


def seed_loaders() -> list[SeedLoader]:
    return [
        HotelsLoader(),
        BuildingsLoader(),
        OsmFeaturesLoader(),
        RoomTypesLoader(),
        DemoUsersLoader(),
        DemoHistoryLoader(),
        RegistryLoader(),
        KnowledgeSeedLoader(),
    ]
