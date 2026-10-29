from collections.abc import Sequence
from uuid import UUID

from geoalchemy2 import Geography
from geoalchemy2.shape import to_shape
from sqlalchemy import cast, func, or_, select
from sqlalchemy.dialects.postgresql import array
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Building, Hotel, OsmFeature
from app.domain.catalog import BuildingShape, HotelGeo, MapFeature
from app.domain.geo.types import LonLat
from app.domain.knowledge.scope import Facade


def hotel_geo(row: Hotel) -> HotelGeo:
    point = to_shape(row.location)
    return HotelGeo(
        id=row.id,
        osm_id=row.osm_id,
        name=row.name,
        district=row.district,
        location=LonLat(point.x, point.y),
        footprint=to_shape(row.footprint),
        floors=row.floors,
        height_m=row.height_m,
        height_source=row.height_source,
        facades=tuple(Facade(f) for f in row.facades),
        ground_m=row.ground_m,
    )


def _near(column: object, point: LonLat, radius_m: float) -> object:
    here = cast(func.ST_SetSRID(func.ST_MakePoint(point.lon, point.lat), 4326), Geography)
    return func.ST_DWithin(cast(column, Geography), here, radius_m)


class CatalogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def hotel(self, hotel_id: UUID) -> Hotel | None:
        return await self._session.get(Hotel, hotel_id)

    async def hotels(self, ids: Sequence[UUID] | None = None) -> list[Hotel]:
        stmt = select(Hotel).order_by(Hotel.district, Hotel.name)
        if ids is not None:
            stmt = stmt.where(Hotel.id.in_(ids))
        return list(await self._session.scalars(stmt))

    async def hotel_ids(self) -> list[UUID]:
        return list(await self._session.scalars(select(Hotel.id).order_by(Hotel.osm_id)))

    async def feature(self, osm_id: str) -> MapFeature | None:
        row = await self._session.scalar(select(OsmFeature).where(OsmFeature.osm_id == osm_id))
        if row is None:
            return None
        return MapFeature(row.osm_id, row.kind, row.name, row.tags, to_shape(row.geom))

    async def features_near(
        self, point: LonLat, radius_m: float, *, kinds: Sequence[str] | None = None
    ) -> list[MapFeature]:
        stmt = select(OsmFeature).where(_near(OsmFeature.geom, point, radius_m))  # type: ignore[arg-type]
        if kinds is not None:
            stmt = stmt.where(OsmFeature.kind.in_(kinds))
        return [
            MapFeature(r.osm_id, r.kind, r.name, r.tags, to_shape(r.geom))
            for r in await self._session.scalars(stmt)
        ]

    async def features_tagged(
        self, tags: dict[str, list[str]], *, near: LonLat | None = None, radius_m: float = 0
    ) -> list[MapFeature]:
        conditions = [OsmFeature.tags[key].astext.in_(values) for key, values in tags.items()]
        stmt = select(OsmFeature).where(or_(*conditions))
        if near is not None:
            stmt = stmt.where(_near(OsmFeature.geom, near, radius_m))  # type: ignore[arg-type]
        return [
            MapFeature(r.osm_id, r.kind, r.name, r.tags, to_shape(r.geom))
            for r in await self._session.scalars(stmt)
        ]

    async def features_with_keys(
        self, keys: Sequence[str], *, near: LonLat | None = None, radius_m: float = 0
    ) -> list[MapFeature]:
        stmt = select(OsmFeature).where(OsmFeature.tags.has_any(array(list(keys))))
        if near is not None:
            stmt = stmt.where(_near(OsmFeature.geom, near, radius_m))  # type: ignore[arg-type]
        return [
            MapFeature(r.osm_id, r.kind, r.name, r.tags, to_shape(r.geom))
            for r in await self._session.scalars(stmt)
        ]

    async def tag_stats(self, tags: dict[str, list[str]]) -> tuple[int, int]:
        conditions = [OsmFeature.tags[key].astext.in_(values) for key, values in tags.items()]
        row = (
            await self._session.execute(
                select(func.count(), func.count(OsmFeature.name)).where(or_(*conditions))
            )
        ).one()
        return int(row[0]), int(row[1])

    async def buildings_near(self, point: LonLat, radius_m: float) -> list[BuildingShape]:
        stmt = select(Building).where(
            _near(Building.geom, point, radius_m),  # type: ignore[arg-type]
            Building.removed_at.is_(None),
        )
        return [
            BuildingShape(r.osm_id, to_shape(r.geom), r.height_m, r.levels, r.height_source)
            for r in await self._session.scalars(stmt)
        ]
