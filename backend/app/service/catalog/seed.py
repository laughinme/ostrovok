import csv
import gzip
from collections.abc import Iterator, Sequence
from pathlib import Path
from typing import Any

import yaml
from shapely import wkb
from sqlalchemy import delete, update

from app.db.bulk import WKB_4326, copy_into
from app.db.models import Building, Hotel, OsmFeature, RoomType
from app.db.uow import UnitOfWork
from app.domain.catalog import building_facades, floors_of, hotel_id

REGION = "region"
DEMO = "demo"


def read_csv_gz(path: Path) -> Iterator[dict[str, str]]:
    with gzip.open(path, "rt", encoding="utf-8", newline="") as file:
        yield from csv.DictReader(file)


def _number(value: str | None) -> float | None:
    return float(value) if value not in (None, "") else None


class HotelsLoader:
    name = "hotels"

    def sources(self, data_dir: Path) -> Sequence[Path]:
        return [data_dir / REGION / "hotels.csv.gz"]

    async def load(self, uow: UnitOfWork, data_dir: Path) -> str:
        await uow.session.execute(delete(Hotel))
        rows = []
        for row in read_csv_gz(data_dir / REGION / "hotels.csv.gz"):
            footprint = wkb.loads(bytes.fromhex(row["footprint_wkb"]))
            height = _number(row["height_m"]) or 9.0
            rows.append(
                (
                    hotel_id(row["osm_id"]),
                    row["osm_id"],
                    row["name"],
                    row["district"],
                    row["tourism"],
                    row["stars"] or None,
                    row["addr"] or None,
                    f"{row['lon']} {row['lat']}",
                    row["building_osm_id"] or None,
                    row["footprint_wkb"],
                    height,
                    floors_of(_number(row["levels"]), height),
                    row["height_source"],
                    "{" + ",".join(f.value for f in building_facades(footprint)) + "}",
                    row.get("osm_timestamp") or None,
                )
            )
        count = await copy_into(
            uow.session,
            Hotel.__tablename__,
            rows,
            columns=[
                "id",
                "osm_id",
                "name",
                "district",
                "tourism",
                "stars",
                "address",
                "location",
                "building_osm_id",
                "footprint",
                "height_m",
                "floors",
                "height_source",
                "facades",
                "osm_timestamp",
            ],
            casts={
                "id": "s.id::uuid",
                "stars": "s.stars::int",
                "location": "ST_SetSRID(ST_MakePoint(split_part(s.location, ' ', 1)::float8,"
                " split_part(s.location, ' ', 2)::float8), 4326)",
                "footprint": WKB_4326.format("s.footprint"),
                "height_m": "s.height_m::float8",
                "floors": "s.floors::int",
                "facades": "s.facades::varchar(2)[]",
            },
        )
        return f"{count} hotels"


class BuildingsLoader:
    name = "buildings"

    def sources(self, data_dir: Path) -> Sequence[Path]:
        return [data_dir / REGION / "buildings.csv.gz"]

    async def load(self, uow: UnitOfWork, data_dir: Path) -> str:
        await uow.session.execute(delete(Building))
        rows = (
            (
                r["osm_id"],
                r["wkb"],
                r["height_m"] or 9.0,
                _levels(r["levels"]),
                r["height_source"],
                r.get("building") or None,
            )
            for r in read_csv_gz(data_dir / REGION / "buildings.csv.gz")
        )
        count = await copy_into(
            uow.session,
            Building.__tablename__,
            rows,
            columns=["osm_id", "geom", "height_m", "levels", "height_source", "kind"],
            casts={
                "geom": WKB_4326.format("s.geom"),
                "height_m": "s.height_m::float8",
                "levels": "s.levels::int",
            },
        )
        return f"{count} buildings"


def _levels(value: str | None) -> int | None:
    number = _number(value)
    return round(number) if number is not None else None


class OsmFeaturesLoader:
    name = "osm_features"

    def sources(self, data_dir: Path) -> Sequence[Path]:
        return [data_dir / REGION / "osm_features.csv.gz"]

    async def load(self, uow: UnitOfWork, data_dir: Path) -> str:
        await uow.session.execute(delete(OsmFeature))
        rows = (
            (r["osm_id"], r["kind"], r.get("name") or None, r["tags"], r["wkb"])
            for r in read_csv_gz(data_dir / REGION / "osm_features.csv.gz")
        )
        count = await copy_into(
            uow.session,
            OsmFeature.__tablename__,
            rows,
            columns=["osm_id", "kind", "name", "tags", "geom"],
            casts={"tags": "s.tags::jsonb", "geom": WKB_4326.format("s.geom")},
        )
        return f"{count} OSM features"


class RoomTypesLoader:
    name = "room_types"

    def sources(self, data_dir: Path) -> Sequence[Path]:
        return [data_dir / DEMO / "room_types.yaml"]

    async def load(self, uow: UnitOfWork, data_dir: Path) -> str:
        await uow.session.execute(delete(RoomType))
        raw = yaml.safe_load((data_dir / DEMO / "room_types.yaml").read_text(encoding="utf-8"))
        hotels: dict[str, Any] = raw.get("hotels", raw)
        count = 0
        for osm_id, card in hotels.items():
            hid = hotel_id(osm_id)
            rooms = card.get("rooms", card.get("room_types", []))
            for position, room in enumerate(rooms):
                uow.session.add(
                    RoomType(
                        id=str(room.get("id") or f"{osm_id}#{position}"),
                        hotel_id=hid,
                        name=room["name"],
                        area=float(room.get("area", room.get("area_m2", 20))),
                        bed=str(room.get("bed", "")),
                        capacity=int(room.get("capacity", 2)),
                        rates=room.get("rates", []),
                        position=position,
                    )
                )
                count += 1
            demo = {k: v for k, v in card.items() if k not in {"rooms", "room_types"}}
            prices = [
                rate.get("price", rate.get("priceDemo", 0))
                for r in rooms
                for rate in r.get("rates", [])
            ]
            await uow.session.execute(
                update(Hotel)
                .where(Hotel.id == hid)
                .values(demo=demo, price_from_demo=min(prices) if prices else None)
            )
        return f"{count} demo room types"
