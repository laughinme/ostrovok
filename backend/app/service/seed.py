"""
Idempotent seed (D-17). Each loader owns some tables, reloads them fully and is versioned by a
hash of its source files: a second `docker compose up` with the same data loads nothing.
"""

import hashlib
import logging
from collections.abc import Sequence
from pathlib import Path
from typing import Protocol

from sqlalchemy import select

from app.db.database import Database
from app.db.models import SeedState
from app.db.uow import UnitOfWork

logger = logging.getLogger(__name__)


class SeedLoader(Protocol):
    name: str

    def sources(self, data_dir: Path) -> Sequence[Path]:
        """Files whose content defines the version; a missing file means "nothing to load yet"."""
        ...

    async def load(self, uow: UnitOfWork, data_dir: Path) -> str:
        """Replace the owned tables with the data; return a one-line summary for the log."""
        ...


def data_version(paths: Sequence[Path], upstream: str = "") -> str | None:
    if not paths or not all(path.exists() for path in paths):
        return None
    digest = hashlib.sha256(upstream.encode())
    for path in sorted(paths):
        digest.update(path.name.encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()[:32]


async def run_seed(db: Database, data_dir: Path, loaders: Sequence[SeedLoader]) -> list[str]:
    applied = []
    upstream = ""
    for loader in loaders:
        version = data_version(loader.sources(data_dir), upstream)
        if version is None:
            logger.info("seed %s: no data yet, skipped", loader.name)
            continue
        upstream = version
        async with db.unit_of_work() as uow:
            state = await uow.session.scalar(
                select(SeedState).where(SeedState.name == loader.name).with_for_update()
            )
            if state is not None and state.version == version:
                continue
            summary = await loader.load(uow, data_dir)
            if state is None:
                uow.session.add(SeedState(name=loader.name, version=version))
            else:
                state.version = version
        logger.info("seed %s: %s", loader.name, summary)
        applied.append(loader.name)
    return applied
