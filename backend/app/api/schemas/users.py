from typing import Self
from uuid import UUID

from app.api.schemas.base import ResponseModel
from app.domain.users import Account, Role


class AccountOut(ResponseModel):
    id: UUID
    email: str
    username: str | None
    role: Role
    persona: str | None

    @classmethod
    def from_domain(cls, account: Account) -> Self:
        return cls.model_validate(account)
