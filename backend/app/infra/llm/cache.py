import hashlib
import json
from typing import Any

from sqlalchemy.dialects.postgresql import insert

from app.db.database import Database
from app.db.models import LlmCacheRow


def cache_key(*parts: str) -> str:
    return hashlib.sha256("\x1f".join(parts).encode()).hexdigest()


class LlmCache:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def get(self, key: str) -> dict[str, Any] | None:
        async with self._db.unit_of_work() as uow:
            row = await uow.session.get(LlmCacheRow, key)
            return {"output": row.output, "usage": row.usage} if row else None

    async def put(
        self, key: str, *, model: str, task: str, output: dict[str, Any], usage: dict[str, Any]
    ) -> None:
        async with self._db.unit_of_work() as uow:
            await uow.session.execute(
                insert(LlmCacheRow)
                .values(key=key, model=model, task=task, output=output, usage=usage)
                .on_conflict_do_nothing(index_elements=["key"])
            )


def schema_fingerprint(model: type[Any]) -> str:
    return json.dumps(model.model_json_schema(), sort_keys=True)
