from shapely import Point

from app.domain.geo.noise_sources import NoiseFeature, noise_sources


def test_osm_classes_hours_and_missing_aircraft_power() -> None:
    features = [
        NoiseFeature("way/1", Point(0, 1), {"highway": "trunk"}),
        NoiseFeature("way/2", Point(0, 1), {"railway": "rail"}),
        NoiseFeature("way/3", Point(0, 1), {"landuse": "construction"}),
        NoiseFeature("node/4", Point(0, 1), {"amenity": "bar"}, late_open=True),
        NoiseFeature("node/5", Point(0, 1), {"amenity": "nightclub"}, late_open=False),
        NoiseFeature("node/6", Point(0, 1), {"amenity": "bar"}),
        NoiseFeature("way/7", Point(0, 1), {"aeroway": "runway"}),
    ]
    result = noise_sources(features)
    assert [s.kind for s in result.sources] == ["road", "rail", "construction", "nightlife"]
    assert result.sources[0].day_db == 75
    assert result.sources[2].night_db is None
    assert result.sources[3].night_db == 60
    assert result.unmodelled_refs == ("node/6", "way/7")
    assert result.completeness == 4 / 6


def test_deduplicate_sources_and_explicit_activity() -> None:
    rail = NoiseFeature("way/1", Point(0, 0), {"railway": "rail"})
    result = noise_sources([rail, rail], rail_activity_share=0.1)
    assert len(result.sources) == 1
    assert result.sources[0].activity_share == 0.1
    airport = NoiseFeature("way/2", Point(0, 0), {"aeroway": "aerodrome"})
    assert noise_sources([airport]).unmodelled_refs == ("way/2",)
    assert noise_sources([airport], aircraft_power_db=80).sources[0].night_db == 80


def test_nightlife_uses_parsed_hours_without_guessing() -> None:
    late = NoiseFeature(
        "node/1", Point(0, 1), {"amenity": "bar", "opening_hours": "Mo-Su 20:00-04:00"}
    )
    early = NoiseFeature(
        "node/2", Point(0, 1), {"amenity": "bar", "opening_hours": "Mo-Su 08:00-23:00"}
    )
    unknown = NoiseFeature(
        "node/3", Point(0, 1), {"amenity": "nightclub", "opening_hours": "variable"}
    )
    result = noise_sources([late, early, unknown])
    assert [source.osm_ref for source in result.sources] == ["node/1"]
    assert result.unmodelled_refs == ("node/3",)
