from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, utcnow


class SeedState(Base):
    __tablename__ = "seed_state"

    name: Mapped[str] = mapped_column(String(64), primary_key=True)
    version: Mapped[str] = mapped_column(String(128))
    applied_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
