"""
Fast bulk loading for the seed (D-17): COPY into a text staging table, then one INSERT … SELECT
that casts columns and builds geometries from hex WKB. Tens of thousands of rows in seconds.
"""

from collections.abc import Iterable, Mapping, Sequence
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

WKB_4326 = "ST_SetSRID(ST_GeomFromWKB(decode({}, 'hex')), 4326)"


async def copy_into(
    session: AsyncSession,
    table: str,
    rows: Iterable[Sequence[Any]],
    *,
    columns: Sequence[str],
    casts: Mapping[str, str],
) -> int:
    """
    `casts` maps a target column to an SQL expression over the staging column `s.<name>`,
    e.g. {"geom": WKB_4326.format("s.geom"), "height_m": "s.height_m::float8"}.
    Table and column names come from our code, never from input, hence the f-strings.
    """
    stage = f"stage_{table}"
    connection = await session.connection()
    await connection.execute(
        text(
            f"CREATE TEMP TABLE {stage} ({', '.join(f'{c} text' for c in columns)}) ON COMMIT DROP"
        )
    )
    raw = (await connection.get_raw_connection()).driver_connection
    records = [tuple(None if v is None else str(v) for v in row) for row in rows]
    await raw.copy_records_to_table(stage, records=records, columns=list(columns))  # type: ignore[union-attr]
    targets = ", ".join(columns)
    values = ", ".join(casts.get(c, f"s.{c}") for c in columns)
    insert = f"INSERT INTO {table} ({targets}) SELECT {values} FROM {stage} s"  # noqa: S608
    await connection.execute(text(insert))
    await connection.execute(text(f"DROP TABLE {stage}"))
    return len(records)
