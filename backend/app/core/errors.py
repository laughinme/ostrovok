from enum import StrEnum
from typing import Any, ClassVar


class ErrorCode(StrEnum):
    """Closed list of machine-readable codes. Clients switch on these, never on `detail` text."""

    BAD_REQUEST = "BAD_REQUEST"
    REQUEST_VALIDATION_ERROR = "REQUEST_VALIDATION_ERROR"
    INVALID_CURSOR = "INVALID_CURSOR"

    NOT_AUTHENTICATED = "NOT_AUTHENTICATED"
    INVALID_TOKEN = "INVALID_TOKEN"  # noqa: S105
    TOKEN_EXPIRED = "TOKEN_EXPIRED"  # noqa: S105
    WRONG_CREDENTIALS = "WRONG_CREDENTIALS"
    SESSION_REVOKED = "SESSION_REVOKED"
    REFRESH_TOKEN_REUSED = "REFRESH_TOKEN_REUSED"  # noqa: S105
    CSRF_FAILED = "CSRF_FAILED"

    FORBIDDEN = "FORBIDDEN"
    ACCOUNT_BANNED = "ACCOUNT_BANNED"
    NOT_HOTEL_STAFF = "NOT_HOTEL_STAFF"

    NOT_FOUND = "NOT_FOUND"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    CONFLICT = "CONFLICT"
    EMAIL_TAKEN = "EMAIL_TAKEN"
    UNKNOWN_PERSONA = "UNKNOWN_PERSONA"

    HOTEL_NOT_FOUND = "HOTEL_NOT_FOUND"
    FACT_NOT_FOUND = "FACT_NOT_FOUND"
    CHARACTERISTIC_NOT_FOUND = "CHARACTERISTIC_NOT_FOUND"
    INVALID_SCOPE = "INVALID_SCOPE"
    INVALID_RECIPE = "INVALID_RECIPE"
    RUN_NOT_FOUND = "RUN_NOT_FOUND"
    SEARCH_NOT_FOUND = "SEARCH_NOT_FOUND"
    QUESTION_NOT_FOUND = "QUESTION_NOT_FOUND"
    BOOKING_NOT_FOUND = "BOOKING_NOT_FOUND"
    INVALID_BOOKING_TRANSITION = "INVALID_BOOKING_TRANSITION"
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"

    RATE_LIMITED = "RATE_LIMITED"
    HTTP_ERROR = "HTTP_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class DomainError(Exception):
    """
    Base for every expected error. The API layer turns it into an RFC 7807 problem response.

    `keep_changes` marks the rare error that must not roll back the transaction:
    e.g. revoking a session after refresh-token reuse, and still answering 401.
    """

    status_code: ClassVar[int] = 400
    error_code: ClassVar[ErrorCode] = ErrorCode.BAD_REQUEST
    default_detail: ClassVar[str] = "Bad request"
    keep_changes: ClassVar[bool] = False

    def __init__(self, detail: str | None = None, *, details: Any = None) -> None:
        self.detail = detail or self.default_detail
        self.details = details
        self.headers: list[tuple[str, str]] = []
        super().__init__(self.detail)


class UnauthorizedError(DomainError):
    status_code = 401
    error_code = ErrorCode.NOT_AUTHENTICATED
    default_detail = "Authentication required"


class InvalidTokenError(UnauthorizedError):
    error_code = ErrorCode.INVALID_TOKEN
    default_detail = "Token is invalid"


class TokenExpiredError(UnauthorizedError):
    error_code = ErrorCode.TOKEN_EXPIRED
    default_detail = "Token has expired"


class ForbiddenError(DomainError):
    status_code = 403
    error_code = ErrorCode.FORBIDDEN
    default_detail = "You don't have permission to do this"


class NotFoundError(DomainError):
    status_code = 404
    error_code = ErrorCode.NOT_FOUND
    default_detail = "Not found"


class ConflictError(DomainError):
    status_code = 409
    error_code = ErrorCode.CONFLICT
    default_detail = "Conflict"


class RateLimitedError(DomainError):
    status_code = 429
    error_code = ErrorCode.RATE_LIMITED
    default_detail = "Too many requests, try again in a minute"
