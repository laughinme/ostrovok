"""Offline regional scenes for reproducible day-plan tests and visual diagnostics."""

import csv
import gzip
import json
from collections.abc import Sequence
from pathlib import Path

from shapely import Point, STRtree, from_wkb, transform
from shapely.prepared import prep

from app.domain.catalog import BuildingShape, HotelGeo, MapFeature, building_facades, hotel_id
from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat
from app.domain.knowledge.fact import Fact
from app.infra.geo.router import ScipyRouter
from app.infra.geo.terrain import NpyTerrain
from app.service.ports import SystemClock
from app.service.recipes.executor import Environment, GeoReader

REGION = Path(__file__).resolve().parents[3] / "data" / "region"
DAY_HOTELS = ("node/10118233110", "node/11119611105", "node/10058556917")


def rows(filename: str) -> list[dict[str, str]]:
    with gzip.open(REGION / filename, "rt") as stream:
        return list(csv.DictReader(stream))


class RegionReader(GeoReader):
    def __init__(self) -> None:
        self.features = [
            MapFeature(
                r["osm_id"], r["kind"], r["name"] or None, json.loads(r["tags"]), from_wkb(r["wkb"])
            )
            for r in rows("osm_features.csv.gz")
        ]
        self.buildings = [
            BuildingShape(
                r["osm_id"], from_wkb(r["wkb"]), float(r["height_m"]), None, r["height_source"]
            )
            for r in rows("buildings.csv.gz")
        ]
        self.feature_tree = STRtree([f.geometry for f in self.features])
        self.building_tree = STRtree([b.geometry for b in self.buildings])

    def _circle(self, point: LonLat, radius_m: float):
        return transform(Point(0, 0).buffer(radius_m), LocalProjection(point).inverse)

    async def features_near(
        self, point: LonLat, radius_m: float, *, kinds: Sequence[str] | None = None
    ):
        circle = self._circle(point, radius_m)
        return [
            self.features[int(i)]
            for i in self.feature_tree.query(circle, predicate="intersects")
            if kinds is None or self.features[int(i)].kind in kinds
        ]

    async def tagged(self, tags, *, near, radius_m):
        features = await self.features_near(near, radius_m)
        return [f for f in features if any(f.tags.get(k) in values for k, values in tags.items())]

    async def buildings_near(self, point: LonLat, radius_m: float):
        circle = self._circle(point, radius_m)
        return [
            self.buildings[int(i)] for i in self.building_tree.query(circle, predicate="intersects")
        ]

    async def facts_of(self, hotel: HotelGeo, key: str) -> list[Fact]:
        return []


def regional_day_environment() -> tuple[dict[str, HotelGeo], Environment]:
    hotels = {}
    for row in rows("hotels.csv.gz"):
        footprint = from_wkb(row["footprint_wkb"])
        hotels[row["osm_id"]] = HotelGeo(
            hotel_id(row["osm_id"]),
            row["osm_id"],
            row["name"],
            row["district"],
            LonLat(float(row["lon"]), float(row["lat"])),
            footprint,
            int(float(row["levels"])),
            float(row["height_m"]),
            row["height_source"],
            building_facades(footprint),
        )
    sea = from_wkb(gzip.decompress((REGION / "sea.wkb.gz").read_bytes()).decode())
    env = Environment(
        RegionReader(),
        SystemClock(),
        router=ScipyRouter.from_file(REGION / "walk_graph.npz"),
        terrain=NpyTerrain(REGION),
        sea=prep(sea),
    )
    return hotels, env
