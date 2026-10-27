from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from app.core.errors import ConflictError, ErrorCode, ForbiddenError, NotFoundError


class Role(StrEnum):
    GUEST = "guest"
    HOTELIER = "hotelier"
    OPERATOR = "operator"


class Permission(StrEnum):
    TRIPS = "trips"
    PARTNER_CABINET = "partner:cabinet"
    CONSOLE_READ = "console:read"
    CONSOLE_WRITE = "console:write"


# Roles are code, not data: a role is a named set of permissions, checked without a DB query.
ROLE_PERMISSIONS: Mapping[Role, frozenset[Permission]] = {
    Role.GUEST: frozenset({Permission.TRIPS}),
    Role.HOTELIER: frozenset({Permission.PARTNER_CABINET}),
    Role.OPERATOR: frozenset(Permission),
}


@dataclass(frozen=True, slots=True)
class CurrentUser:
    """Who is calling. The only user object the API layer ever sees."""

    id: UUID
    role: Role
    session_id: UUID

    def can(self, permission: Permission) -> bool:
        return permission in ROLE_PERMISSIONS[self.role]


class UserNotFoundError(NotFoundError):
    error_code = ErrorCode.USER_NOT_FOUND
    default_detail = "User not found"


class EmailTakenError(ConflictError):
    error_code = ErrorCode.EMAIL_TAKEN
    default_detail = "This email is already registered"


class AccountBannedError(ForbiddenError):
    error_code = ErrorCode.ACCOUNT_BANNED
    default_detail = "Your account is banned"


def normalize_email(email: str) -> str:
    return email.strip().lower()


@dataclass(frozen=True, slots=True)
class Account:
    id: UUID
    email: str
    username: str | None
    role: Role
    persona: str | None
