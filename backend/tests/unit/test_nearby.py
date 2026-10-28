"""What is around a hotel: the nearest place of each everyday kind, named places first."""

from shapely import Point

from app.domain.catalog import MapFeature, nearby_places
from app.domain.geo.types import LonLat

HOTEL = LonLat(39.72, 43.58)
# 0.00124° of longitude is about 100 m at this latitude
EAST_100M = 0.00124


def _poi(osm_id: str, east_m: float, tags: dict[str, str], *, kind: str = "poi") -> MapFeature:
    point = Point(HOTEL.lon + EAST_100M * east_m / 100, HOTEL.lat)
    return MapFeature(osm_id, kind, tags.get("name"), tags, point)


def test_nearest_of_each_kind_in_card_order() -> None:
    features = [
        _poi("node/1", 300, {"amenity": "pharmacy", "name": "Апрель"}),
        _poi("node/2", 900, {"amenity": "pharmacy", "name": "Далёкая"}),
        _poi("way/3", 450, {"natural": "beach", "name": "Ривьера"}, kind="beach"),
        _poi("node/4", 50, {"amenity": "bench"}),
    ]

    places = nearby_places(HOTEL, features)

    assert [(p.kind, p.name) for p in places] == [("beach", "Ривьера"), ("pharmacy", "Апрель")]
    assert 280 < places[1].distance_m < 320


def test_named_place_wins_over_a_closer_nameless_one() -> None:
    features = [
        _poi("node/1", 40, {"amenity": "cafe"}),
        _poi("node/2", 120, {"amenity": "cafe", "name": "Маяк"}),
    ]

    assert nearby_places(HOTEL, features)[0].name == "Маяк"


def test_far_places_and_private_grounds_are_left_out() -> None:
    features = [
        _poi("node/1", 1500, {"shop": "supermarket", "name": "Пятёрочка"}),
        _poi("way/2", 200, {"leisure": "park", "name": "Санаторий «Русь»"}, kind="park"),
        _poi("way/3", 300, {"leisure": "park", "tourism": "hotel", "name": "Радуга"}, kind="park"),
        _poi("node/4", 60, {"leisure": "playground", "name": "Детский сад № 115"}),
    ]

    assert nearby_places(HOTEL, features) == ()
