"""A reserve OSM object becomes a hotel and a durable research job in one transaction."""

from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from geoalchemy2.shape import from_shape
from shapely import Point, from_wkb
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.errors import ConflictError
from app.db.models import Hotel
from app.db.uow import UnitOfWork
from app.domain.agents import AgentKind, Planner
from app.domain.catalog import building_facades, floors_of, hotel_id
from app.domain.jobs import JobKind
from app.service.agents.runtime import launch
from app.service.catalog.hotels import HotelNotFoundError
from app.service.catalog.seed import read_csv_gz
from app.service.ports import Clock


@dataclass(frozen=True, slots=True)
class ReserveHotel:
    osm_id: str
    name: str
    district: str
    location: tuple[float, float]
    floors: int

    @classmethod
    def of(cls, row: dict[str, str]) -> "ReserveHotel":
        height = float(row["height_m"] or 9)
        return cls(
            row["osm_id"],
            row["name"],
            row["district"],
            (float(row["lon"]), float(row["lat"])),
            floors_of(float(row["levels"]) if row["levels"] else None, height),
        )


class HotelOnboarding:
    def __init__(self, uow: UnitOfWork, clock: Clock, data_dir: Path) -> None:
        self._uow, self._clock = uow, clock
        self._path = data_dir / "region" / "reserve_hotels.csv.gz"

    def _rows(self) -> list[dict[str, str]]:
        return list(read_csv_gz(self._path)) if self._path.exists() else []

    async def reserve(self) -> list[ReserveHotel]:
        existing = set(await self._uow.session.scalars(select(Hotel.osm_id)))
        return [ReserveHotel.of(r) for r in self._rows() if r["osm_id"] not in existing]

    async def start(self, osm_id: str) -> tuple[UUID, UUID]:
        row = next((r for r in self._rows() if r["osm_id"] == osm_id), None)
        if row is None:
            raise HotelNotFoundError("Отеля нет в резервном списке OSM")
        hotel = ReserveHotel.of(row)
        hid = hotel_id(osm_id)
        if not await self._insert(row, hotel):
            raise ConflictError("Отель уже добавлен в каталог")
        run_id = await launch(
            self._uow,
            self._clock,
            agent=AgentKind.RESEARCHER,
            goal=f"Изучить новый отель «{hotel.name}» и задать вопросы",
            planner=Planner.RULES,
            job=JobKind.HOTEL_ONBOARD,
            payload={"hotel_id": str(hid)},
            subject={"hotelIds": [str(hid)], "osmId": osm_id},
            dedupe_key=f"onboard:{hid}",
        )
        return run_id, hid

    async def _insert(self, row: dict[str, str], hotel: ReserveHotel) -> bool:
        footprint = from_wkb(bytes.fromhex(row["footprint_wkb"]))
        inserted = await self._uow.session.scalar(
            insert(Hotel)
            .values(
                id=hotel_id(hotel.osm_id),
                osm_id=hotel.osm_id,
                name=hotel.name,
                district=hotel.district,
                tourism=row["tourism"],
                stars=int(row["stars"]) if row["stars"].isdigit() else None,
                address=row["addr"] or None,
                location=from_shape(Point(*hotel.location), srid=4326),
                footprint=from_shape(footprint, srid=4326),
                building_osm_id=row["building_osm_id"],
                height_m=float(row["height_m"] or 9),
                floors=hotel.floors,
                height_source=row["height_source"],
                facades=[f.value for f in building_facades(footprint)],
                osm_timestamp=row["osm_timestamp"] or None,
                demo={"onboarded": True},
            )
            .on_conflict_do_nothing(index_elements=["osm_id"])
            .returning(Hotel.id)
        )
        return inserted is not None
