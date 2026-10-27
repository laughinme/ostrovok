from app.service.accounts_seed import DemoUsersLoader
from app.service.catalog.seed import (
    BuildingsLoader,
    HotelsLoader,
    OsmFeaturesLoader,
    RoomTypesLoader,
)
from app.service.seed import SeedLoader


def seed_loaders() -> list[SeedLoader]:
    """
    Order matters, and versions are cumulative: when hotels reload (cascading their facts),
    every loader after them reloads too.
    """
    return [
        HotelsLoader(),
        BuildingsLoader(),
        OsmFeaturesLoader(),
        RoomTypesLoader(),
        DemoUsersLoader(),
    ]
