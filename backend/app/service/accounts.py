from uuid import UUID

from app.db.uow import UnitOfWork
from app.domain.users import Account, UserNotFoundError


class AccountService:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def get(self, user_id: UUID) -> Account:
        user = await self._uow.users.get(user_id)
        if user is None:
            raise UserNotFoundError()
        return Account(
            id=user.id,
            email=user.email,
            username=user.username,
            role=user.role,
            persona=user.persona,
        )
