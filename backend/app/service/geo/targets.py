from app.domain.catalog import HotelGeo, MapFeature
from app.service.recipes.executor import Environment

SEA_TOUCH_DEG = 0.003
SEARCH_RADIUS_M = 3000
CENTER_RADIUS_M = 50000


async def route_targets(hotel: HotelGeo, env: Environment, target: str) -> list[MapFeature]:
    if target == "center":
        features = await env.reader.tagged(
            {"place": ["city", "town"], "amenity": ["townhall"]},
            near=hotel.location,
            radius_m=CENTER_RADIUS_M,
        )
        return [
            f
            for f in features
            if f.tags.get("place") in {"city", "town"}
            or "администрация города" in (f.name or "").lower()
        ]
    if target.startswith("osm:"):
        feature = await env.reader.feature(target.removeprefix("osm:"))
        return [feature] if feature is not None else []
    features = await env.reader.features_near(hotel.location, SEARCH_RADIUS_M, kinds=[target])
    if target == "beach" and env.sea is not None:
        features = [f for f in features if env.sea.intersects(f.geometry.buffer(SEA_TOUCH_DEG))]
    return features
