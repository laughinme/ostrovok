from datetime import datetime
from typing import Any
from uuid import UUID

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import BigInteger, ForeignKey, Index, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UuidPkMixin, utcnow

GEOMETRY = Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True)
POINT = Geometry(geometry_type="POINT", srid=4326, spatial_index=True)


class Hotel(UuidPkMixin, TimestampMixin, Base):
    __tablename__ = "hotels"

    osm_id: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    district: Mapped[str] = mapped_column(String(32), index=True)
    tourism: Mapped[str] = mapped_column(String(32))
    stars: Mapped[int | None]
    address: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[WKBElement] = mapped_column(POINT)
    building_osm_id: Mapped[str | None] = mapped_column(String(32))
    footprint: Mapped[WKBElement] = mapped_column(GEOMETRY)
    height_m: Mapped[float]
    floors: Mapped[int]
    height_source: Mapped[str] = mapped_column(String(16))
    ground_m: Mapped[float] = mapped_column(default=0.0, server_default="0")
    facades: Mapped[list[str]] = mapped_column(ARRAY(String(2)))
    demo: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    price_from_demo: Mapped[int | None]
    osm_timestamp: Mapped[str | None] = mapped_column(String(32))


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    osm_id: Mapped[str | None] = mapped_column(String(32), unique=True)
    geom: Mapped[WKBElement] = mapped_column(GEOMETRY)
    height_m: Mapped[float]
    levels: Mapped[int | None]
    height_source: Mapped[str] = mapped_column(String(16))
    kind: Mapped[str | None] = mapped_column(String(64))
    added_by: Mapped[str] = mapped_column(String(16), default="osm", server_default="osm")
    world_change_id: Mapped[UUID | None]
    removed_at: Mapped[datetime | None]


class OsmFeature(Base):
    __tablename__ = "osm_features"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    osm_id: Mapped[str] = mapped_column(String(32), index=True)
    kind: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str | None] = mapped_column(String(255))
    tags: Mapped[dict[str, str]] = mapped_column(JSONB)
    geom: Mapped[WKBElement] = mapped_column(GEOMETRY)

    __table_args__ = (Index("ix_osm_features_tags", "tags", postgresql_using="gin"),)


class RoomType(Base):
    __tablename__ = "room_types"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    hotel_id: Mapped[UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    area: Mapped[float]
    bed: Mapped[str] = mapped_column(String(64))
    capacity: Mapped[int]
    rates: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    position: Mapped[int] = mapped_column(default=0, server_default="0")


class FacadeRoom(UuidPkMixin, Base):
    __tablename__ = "facade_rooms"

    hotel_id: Mapped[UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"), index=True)
    room_type_id: Mapped[str] = mapped_column(ForeignKey("room_types.id", ondelete="CASCADE"))
    facade: Mapped[str] = mapped_column(String(2))
    floor_from: Mapped[int]
    floor_to: Mapped[int]
    confirmed_by_hotel: Mapped[bool] = mapped_column(default=False, server_default="false")
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())


class WorldChange(UuidPkMixin, Base):
    __tablename__ = "world_changes"

    kind: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(Text)
    geom: Mapped[WKBElement | None] = mapped_column(GEOMETRY, nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    affected_hotels: Mapped[list[UUID]] = mapped_column(ARRAY(Uuid()), default=list)
    run_id: Mapped[UUID | None]
    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
    reverted_at: Mapped[datetime | None]
