from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, user: User) -> None:
        self._session.add(user)

    async def get(self, user_id: UUID, *, for_update: bool = False) -> User | None:
        if not for_update:
            return await self._session.get(User, user_id)
        # Row lock for read-modify-write (auth_version bump).
        stmt = (
            select(User)
            .where(User.id == user_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return await self._session.scalar(stmt)

    async def get_by_email(self, email: str) -> User | None:
        return await self._session.scalar(select(User).where(User.email == email))

    async def get_by_persona(self, persona: str) -> User | None:
        return await self._session.scalar(select(User).where(User.persona == persona))
