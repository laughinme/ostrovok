from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid5

import yaml
from sqlalchemy import delete, select

from app.db.models import User, UserEventRow
from app.db.uow import UnitOfWork

_NAMESPACE = UUID("e2076895-a870-4345-9ad3-5a0a4ade6427")


def _history_events(profile: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    events = []
    for source, kind in (
        ("bookings", "booking"),
        ("saved_hotels", "saved_hotel"),
        ("rejected_hotels", "rejected_hotel"),
        ("chip_edits", "chip_edit"),
    ):
        for raw in profile.get(source, []):
            payload = {"osm_id": raw} if isinstance(raw, str) else dict(raw)
            events.append((kind, payload | {"isDemo": True, "seed": "demo_history"}))
    return events


class DemoHistoryLoader:
    name = "demo_history"

    def sources(self, data_dir: Path) -> Sequence[Path]:
        return [data_dir / "demo" / "history.yaml"]

    async def load(self, uow: UnitOfWork, data_dir: Path) -> str:
        profiles = yaml.safe_load(self.sources(data_dir)[0].read_text(encoding="utf-8"))["guests"]
        await uow.session.execute(
            delete(UserEventRow).where(
                UserEventRow.payload["seed"].astext == "demo_history",
            )
        )
        count = 0
        for persona, profile in profiles.items():
            user = await uow.session.scalar(select(User).where(User.persona == persona))
            if user is None:
                continue
            for index, (kind, payload) in enumerate(_history_events(profile)):
                event_id = uuid5(_NAMESPACE, f"{persona}:{kind}:{index}")
                at = datetime.fromisoformat(
                    str(payload.get("at", payload.get("check_out", "2026-10-20")))
                )
                await uow.session.merge(
                    UserEventRow(
                        id=event_id,
                        user_id=user.id,
                        kind=kind,
                        payload=payload,
                        at=at if at.tzinfo else at.replace(tzinfo=UTC),
                    )
                )
                count += 1
        await uow.flush()
        return f"{count} demo guest events"
