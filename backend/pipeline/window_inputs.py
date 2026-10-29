import csv
import gzip
import json
from collections.abc import Sequence
from pathlib import Path

import numpy as np
from shapely import Point, STRtree, box, from_wkb, transform

from app.domain.catalog import (
    BuildingShape,
    HotelGeo,
    MapFeature,
    building_facades,
    floors_of,
    hotel_id,
)
from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat
from app.service.recipes.executor import GeoReader


def hotels(directory: Path) -> list[HotelGeo]:
    result = []
    with gzip.open(directory / "hotels.csv.gz", "rt") as stream:
        for row in csv.DictReader(stream):
            footprint = from_wkb(row["footprint_wkb"])
            height = float(row["height_m"])
            result.append(
                HotelGeo(
                    hotel_id(row["osm_id"]),
                    row["osm_id"],
                    row["name"],
                    row["district"],
                    LonLat(float(row["lon"]), float(row["lat"])),
                    footprint,
                    floors_of(float(row["levels"]) if row["levels"] else None, height),
                    height,
                    row["height_source"],
                    building_facades(footprint),
                )
            )
    return result


class RegionViewReader(GeoReader):
    def __init__(self, directory: Path) -> None:
        self._shapes = []
        with gzip.open(directory / "buildings.csv.gz", "rt") as stream:
            for row in csv.DictReader(stream):
                self._shapes.append(
                    BuildingShape(
                        row["osm_id"],
                        from_wkb(row["wkb"]),
                        float(row["height_m"]),
                        int(float(row["levels"])) if row["levels"] else None,
                        row["height_source"],
                    )
                )
        self._tree = STRtree([b.geometry for b in self._shapes])
        self._peaks = []
        with gzip.open(directory / "osm_features.csv.gz", "rt") as stream:
            for row in csv.DictReader(stream):
                if row["kind"] == "peak" and row["name"]:
                    self._peaks.append(
                        MapFeature(
                            row["osm_id"],
                            "peak",
                            row["name"],
                            json.loads(row["tags"]),
                            from_wkb(row["wkb"]),
                        )
                    )

    async def buildings_near(self, point: LonLat, radius_m: float) -> list[BuildingShape]:
        projection = LocalProjection(point)
        corners = projection.inverse(
            np.array([[-radius_m, -radius_m], [radius_m, radius_m]]) * 1.01
        )
        candidates = self._tree.query(box(*corners.reshape(-1)))
        return [
            self._shapes[int(i)]
            for i in candidates
            if transform(self._shapes[int(i)].geometry, projection.forward).distance(Point(0, 0))
            <= radius_m
        ]

    async def features_near(
        self,
        point: LonLat,
        radius_m: float,
        *,
        kinds: Sequence[str] | None = None,
    ) -> list[MapFeature]:
        if kinds is not None and "peak" not in kinds:
            return []
        projection = LocalProjection(point)
        return [
            peak
            for peak in self._peaks
            if transform(peak.geometry, projection.forward).distance(Point(0, 0)) <= radius_m
        ]
