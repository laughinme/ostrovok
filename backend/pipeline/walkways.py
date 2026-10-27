"""Walking access, explicit pedestrian directionality and conserved step counts."""

import numpy as np
from numpy.typing import NDArray

WALK_CLASSES = frozenset(
    {
        "footway",
        "steps",
        "path",
        "pedestrian",
        "living_street",
        "residential",
        "service",
        "unclassified",
        "tertiary",
        "tertiary_link",
        "secondary",
        "secondary_link",
        "primary",
        "primary_link",
        "track",
        "road",
        "cycleway",
        "corridor",
        "bridleway",
    }
)
ALLOW_FOOT = frozenset({"yes", "designated", "permissive", "official"})
DENY_ACCESS = frozenset({"no", "private", "agricultural", "forestry"})
MAJOR_ROADS = frozenset({"trunk", "trunk_link", "primary", "primary_link", "secondary"})


def walkable(tags: dict[str, str]) -> bool:
    """Vehicle one-way streets remain walkable both ways unless oneway:foot is explicit."""
    foot = tags.get("foot")
    if foot in DENY_ACCESS:
        return False
    if tags.get("access") in DENY_ACCESS and foot not in ALLOW_FOOT:
        return False
    highway = tags.get("highway")
    if highway in WALK_CLASSES:
        return True
    return highway in {"trunk", "trunk_link", "motorway", "motorway_link"} and foot in ALLOW_FOOT


def directions(tags: dict[str, str]) -> tuple[bool, bool]:
    value = tags.get("oneway:foot", "no")
    return value != "-1", value not in {"yes", "1", "true"}


def grade(tags: dict[str, str]) -> str:
    """Do not join coincident interior vertices of bridges, tunnels and ground ways."""
    if "layer" in tags:
        return tags["layer"]
    if tags.get("bridge", "no") != "no":
        return "1"
    if tags.get("tunnel", "no") != "no":
        return "-1"
    return "0"


def step_counts(tags: dict[str, str], lengths: NDArray[np.float64]) -> NDArray[np.int64]:
    """Allocate a whole-way count across unsimplified segments without multiplying it."""
    if tags.get("highway") != "steps":
        return np.zeros(len(lengths), dtype=np.int64)
    value = tags.get("step_count", "")
    total = (
        int(value) if value.isdecimal() and int(value) > 0 else max(1, round(lengths.sum() / 0.3))
    )
    shares = lengths / lengths.sum() * total
    counts = np.floor(shares).astype(np.int64)
    remainder = total - int(counts.sum())
    indices = np.argsort(-(shares - counts), kind="stable")[:remainder]
    counts[indices] += 1
    return counts


def uncertain_way(tags: dict[str, str]) -> bool:
    if not tags.get("surface"):
        return True
    if tags.get("highway") == "steps":
        value = tags.get("step_count", "")
        return not value.isdecimal() or int(value) <= 0
    return False
