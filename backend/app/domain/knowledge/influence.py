"""What a change of the world can affect (09 §5.6): the radius of influence of each method."""

from collections.abc import Mapping, Sequence

from app.domain.knowledge.characteristic import Characteristic, MethodKind

INFLUENCE_RADIUS_M: Mapping[MethodKind, float] = {
    MethodKind.VIEW: 2000,
    MethodKind.SUN_EVENT: 2000,
    MethodKind.NOISE: 500,
    MethodKind.WALK_TO: 2000,
    MethodKind.AREA_STAT: 300,
    MethodKind.POI_NEARBY: 1500,
}
# A new building changes the skyline and screens noise; it is not a café or a footpath.
BUILDING_METHODS = frozenset({MethodKind.VIEW, MethodKind.SUN_EVENT, MethodKind.NOISE})


def affected_keys(
    characteristics: Sequence[Characteristic], distance_m: float, methods: frozenset[MethodKind]
) -> list[str]:
    """Characteristics of a hotel at `distance_m` from the change that must be recomputed."""
    return [
        c.key
        for c in characteristics
        if c.method in methods and distance_m <= INFLUENCE_RADIUS_M.get(c.method, 0)
    ]
