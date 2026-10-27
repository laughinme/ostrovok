from datetime import timedelta
from pathlib import Path

from sqlalchemy import func, select

from app.db.database import Database
from app.db.models import FactVersionRow
from app.domain.catalog import hotel_id
from app.domain.knowledge.fact import FactStatus
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.scope import Facade, Scope
from app.domain.knowledge.sources import SourceKind
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import RegistryLoader
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders
from tests.factories import FakeClock
from tests.seed_data import write_region

REGISTRY = Path(__file__).resolve().parents[2] / "data"
MAYAK = hotel_id("way/1")


def _obs(
    clock: FakeClock, scope: Scope, value: bool, conf: float, source: SourceKind
) -> Observation:
    return Observation(
        hotel_id=MAYAK,
        characteristic="sea_view",
        characteristic_version=1,
        scope=scope,
        value=value,
        confidence=conf,
        source=source,
        source_ref="method:view@1" if source is SourceKind.COMPUTED else "answer:42",
        method="горизонт по рельефу и зданиям",
        observed_at=clock.now(),
        valid_until=clock.now() + timedelta(days=365),
        is_demo=source is SourceKind.HOTELIER,
    )


async def _seeded(db: Database, tmp_path: Path) -> None:
    await run_seed(db, write_region(tmp_path), [*seed_loaders(), RegistryLoader()])
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, REGISTRY)


async def test_mayak_claim_conflicts_with_physics(db: Database, tmp_path: Path) -> None:
    await _seeded(db, tmp_path)
    clock = FakeClock()
    south = Scope(facades=frozenset({Facade.S}), floor_from=4)
    computed = [
        _obs(clock, south, True, 0.82, SourceKind.COMPUTED),
        _obs(
            clock, Scope(facades=frozenset({Facade.S}), floor_to=3), False, 0.9, SourceKind.COMPUTED
        ),
        *(
            _obs(clock, Scope(facades=frozenset({f})), False, 0.95, SourceKind.COMPUTED)
            for f in (Facade.N, Facade.E, Facade.W)
        ),
    ]

    async with db.unit_of_work() as uow:
        first = await KnowledgeStore(uow, clock).record(computed, reason="расчёт вида")
    clock.advance(timedelta(days=3))
    async with db.unit_of_work() as uow:
        second = await KnowledgeStore(uow, clock).record(
            [_obs(clock, Scope.everywhere(), True, 0.9, SourceKind.HOTELIER)],
            reason="ответ отеля",
        )
    async with db.unit_of_work() as uow:
        facts = await uow.knowledge.facts([MAYAK], characteristic="sea_view")
        versions = await uow.session.scalar(select(func.count()).select_from(FactVersionRow))

    assert first.opened_conflicts == ()
    assert len(second.opened_conflicts) == 1
    top = next(f for f in facts if f.scope == south)
    assert top.value is True
    assert top.statement == "Море видно из окон"
    assert top.scope_text == "Ю-фасад, этаж 4 и выше"
    disputed = [f for f in facts if f.status is FactStatus.CONFLICT]
    assert disputed
    assert all(f.value is False for f in disputed)
    assert all(f.conflict_id == second.opened_conflicts[0] for f in disputed)
    assert versions == len(first.changed_facts) + len(second.changed_facts)


async def test_same_observation_again_changes_nothing(db: Database, tmp_path: Path) -> None:
    await _seeded(db, tmp_path)
    clock = FakeClock()
    obs = _obs(clock, Scope.everywhere(), False, 0.9, SourceKind.COMPUTED)

    async with db.unit_of_work() as uow:
        await KnowledgeStore(uow, clock).record([obs], reason="первый расчёт")
    async with db.unit_of_work() as uow:
        again = await KnowledgeStore(uow, clock).record(
            [_obs(clock, Scope.everywhere(), False, 0.9, SourceKind.COMPUTED)], reason="повтор"
        )
        active = await uow.knowledge.active_observations(MAYAK, "sea_view")

    assert again.changed_facts == ()
    assert len(active) == 1
