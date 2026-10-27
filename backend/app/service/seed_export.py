"""
Collected knowledge travels with the repo (09 §3.1, §13): `export-seed` dumps the knowledge and
trace tables to JSONL.gz; the seed loader puts them back with one generic statement per batch.
"""

import gzip
from collections.abc import Sequence
from pathlib import Path

from sqlalchemy import text

from app.db.database import Database
from app.db.uow import UnitOfWork

# Parents first: loading respects foreign keys.
KNOWLEDGE_TABLES = (
    "agent_runs",
    "agent_steps",
    "observations",
    "conflicts",
    "facts",
    "fact_versions",
    "hotelier_questions",
)
_BATCH = 2000


async def export_tables(
    db: Database, out_dir: Path, tables: Sequence[str] = KNOWLEDGE_TABLES
) -> dict[str, int]:
    out_dir.mkdir(parents=True, exist_ok=True)  # noqa: ASYNC240 - CLI, nothing else runs
    counts = {}
    async with db.raw_session() as session:
        for table in tables:
            rows = await session.execute(text(f"SELECT row_to_json(t)::text FROM {table} t"))  # noqa: S608
            path = out_dir / f"{table}.jsonl.gz"
            count = 0
            with gzip.open(path, "wt", encoding="utf-8") as file:
                for (line,) in rows:
                    file.write(line + "\n")
                    count += 1
            counts[table] = count
    return counts


async def import_table(uow: UnitOfWork, path: Path, table: str) -> int:
    with gzip.open(path, "rt", encoding="utf-8") as file:
        lines = [line for line in file if line.strip()]
    for start in range(0, len(lines), _BATCH):
        batch = "[" + ",".join(lines[start : start + _BATCH]) + "]"
        await uow.session.execute(
            text(
                f"INSERT INTO {table} SELECT * FROM json_populate_recordset(NULL::{table}, "  # noqa: S608
                "CAST(:rows AS json))"
            ),
            {"rows": batch},
        )
    return len(lines)


class KnowledgeSeedLoader:
    """Loads `data/seed/*.jsonl.gz` written by `make collect` (knowledge and agent traces)."""

    name = "knowledge"

    def sources(self, data_dir: Path) -> Sequence[Path]:
        return [data_dir / "seed" / f"{t}.jsonl.gz" for t in KNOWLEDGE_TABLES]

    async def load(self, uow: UnitOfWork, data_dir: Path) -> str:
        for table in reversed(KNOWLEDGE_TABLES):
            await uow.session.execute(text(f"DELETE FROM {table}"))  # noqa: S608
        counts = {
            t: await import_table(uow, data_dir / "seed" / f"{t}.jsonl.gz", t)
            for t in KNOWLEDGE_TABLES
        }
        return ", ".join(f"{t} {n}" for t, n in counts.items())
