"""The reserve is real catalog data with buildings already available to the live researcher."""

from pathlib import Path

from shapely import from_wkb

from app.service.catalog.seed import read_csv_gz

REGION = Path(__file__).resolve().parents[3] / "data" / "region"


def test_reserve_has_distinct_hotels_and_existing_footprints() -> None:
    primary = list(read_csv_gz(REGION / "hotels.csv.gz"))
    reserve = list(read_csv_gz(REGION / "reserve_hotels.csv.gz"))
    buildings = {b["osm_id"]: b for b in read_csv_gz(REGION / "buildings.csv.gz")}
    assert 15 <= len(reserve) <= 20
    assert len({h["osm_id"] for h in reserve}) == len(reserve)
    assert len({h["building_osm_id"] for h in reserve}) == len(reserve)
    assert not {h["osm_id"] for h in primary} & {h["osm_id"] for h in reserve}
    assert not {h["building_osm_id"] for h in primary} & {h["building_osm_id"] for h in reserve}
    assert {h["district"] for h in reserve} == {h["district"] for h in primary}
    for hotel in reserve:
        footprint = from_wkb(bytes.fromhex(hotel["footprint_wkb"]))
        building = buildings[hotel["building_osm_id"]]
        assert footprint.is_valid
        assert not footprint.is_empty
        assert footprint.equals(from_wkb(bytes.fromhex(building["wkb"])))
        assert hotel["height_m"] == building["height_m"]
