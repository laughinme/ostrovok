import re
from collections.abc import Mapping, Sequence

ANY = "*"
_NAME_KEYS = ("name", "alt_name", "official_name", "short_name", "brand")


def _values(raw: str) -> set[str]:
    return {v.strip() for v in raw.split(";") if v.strip()}


def _pair_matches(tags: Mapping[str, str], key: str, allowed: Sequence[str]) -> bool:
    if key not in tags:
        return False
    return ANY in allowed or bool(_values(tags[key]) & set(allowed))


def _name_matches(tags: Mapping[str, str], contains: Sequence[str], regex: str | None) -> bool:
    names = " ".join(tags.get(k, "") for k in _NAME_KEYS).lower()
    if contains and not any(part.lower() in names for part in contains):
        return False
    return not (regex and not re.search(regex, names))


def tags_match(
    tags: Mapping[str, str],
    *,
    any_tag: Mapping[str, Sequence[str]] | None = None,
    any_of: Sequence[Mapping[str, Sequence[str]]] = (),
    name_contains: Sequence[str] = (),
    name_regex: str | None = None,
) -> bool:
    by_pair = any(_pair_matches(tags, k, v) for k, v in (any_tag or {}).items())
    by_alternative = any(all(_pair_matches(tags, k, v) for k, v in alt.items()) for alt in any_of)
    if not (by_pair or by_alternative):
        return False
    return _name_matches(tags, name_contains, name_regex)


def keys_of(
    any_tag: Mapping[str, Sequence[str]] | None, any_of: Sequence[Mapping[str, Sequence[str]]]
) -> list[str]:
    keys = set(any_tag or {})
    for alt in any_of:
        keys.update(k for k in alt if k != "name")
    return sorted(keys)
