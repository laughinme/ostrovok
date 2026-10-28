from datetime import date, timedelta

from app.domain.knowledge.scope import Scope


def trip_months(start: date, end: date) -> frozenset[int]:
    return frozenset((start + timedelta(days=i)).month for i in range((end - start).days))


def intersection(a: Scope, b: Scope) -> Scope | None:
    low = max(a.floor_from or 1, b.floor_from or 1)
    highs = [n for n in (a.floor_to, b.floor_to) if n is not None]
    high = min(highs) if highs else None
    if high is not None and low > high:
        return None
    sets = {}
    for name in ("facades", "months", "room_types"):
        left, right = getattr(a, name), getattr(b, name)
        value = left & right if left is not None and right is not None else left or right
        if value is not None and not value:
            return None
        sets[name] = value
    return Scope(floor_from=low, floor_to=high, **sets)
