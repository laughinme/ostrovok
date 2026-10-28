from dataclasses import dataclass

from app.core.errors import ErrorCode, ForbiddenError


class NotHotelStaffError(ForbiddenError):
    error_code = ErrorCode.NOT_HOTEL_STAFF
    default_detail = "You are not staff of this hotel"


def ensure_staff_of(*, is_staff: bool) -> None:
    if not is_staff:
        raise NotHotelStaffError()


def question_value(demand: int, probability: float | None, influence: float) -> float:
    uncertainty = 1.0 if probability is None else 1 - abs(2 * probability - 1)
    return max(0, demand) * max(0.0, uncertainty) * max(0.0, influence)


@dataclass(frozen=True, slots=True)
class QuestionDraft:
    characteristic: str
    text: str
    why: str
    value: float
    answer_kind: str
    options: tuple[str, ...] = ()
    conflict_id: str | None = None
    facade: str | None = None
