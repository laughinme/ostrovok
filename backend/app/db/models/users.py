from datetime import datetime

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UuidPkMixin, pg_enum
from app.domain.users import Role


class User(UuidPkMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    username: Mapped[str | None] = mapped_column(String(64))

    role: Mapped[Role] = mapped_column(
        pg_enum(Role, "user_role"), default=Role.GUEST, server_default=Role.GUEST.value
    )
    persona: Mapped[str | None] = mapped_column(String(64), unique=True)
    banned_at: Mapped[datetime | None]
    # Bumped on ban and "log out everywhere"; access tokens carry it and stop working on mismatch.
    auth_version: Mapped[int] = mapped_column(default=1, server_default="1")
