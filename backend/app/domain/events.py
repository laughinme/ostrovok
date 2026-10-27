from enum import StrEnum


class Topic(StrEnum):
    """Outbox topics: side effects that must happen only after the transaction commits."""

    USER_REGISTERED = "user.registered"


class OutboxStatus(StrEnum):
    PENDING = "pending"
    DONE = "done"
    DEAD = "dead"
