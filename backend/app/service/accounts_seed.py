from collections.abc import Sequence
from pathlib import Path

import yaml
from sqlalchemy import delete

from app.db.models import HotelStaff, User
from app.db.uow import UnitOfWork
from app.domain.catalog import hotel_id
from app.domain.users import Role

# Persona accounts never log in with a password; argon2 rejects this value as a hash.
NO_PASSWORD = "!persona"  # noqa: S105


class DemoUsersLoader:
    name = "demo_users"

    def sources(self, data_dir: Path) -> Sequence[Path]:
        return [data_dir / "demo" / "users.yaml"]

    async def load(self, uow: UnitOfWork, data_dir: Path) -> str:
        raw = yaml.safe_load((data_dir / "demo" / "users.yaml").read_text(encoding="utf-8"))
        await uow.session.execute(delete(User).where(User.persona.is_not(None)))
        personas = raw["personas"]
        for persona in personas:
            user = User(
                email=f"{persona['key']}@demo.okno",
                password_hash=NO_PASSWORD,
                username=persona["name"],
                role=Role(persona["role"]),
                persona=persona["key"],
            )
            uow.users.add(user)
            await uow.flush()
            for osm_id in persona.get("hotels", []):
                uow.session.add(HotelStaff(user_id=user.id, hotel_id=hotel_id(osm_id)))
        return f"{len(personas)} demo personas"
