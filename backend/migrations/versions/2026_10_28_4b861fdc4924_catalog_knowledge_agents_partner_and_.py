"""catalog, knowledge, agents, partner and guest tables

Revision ID: 4b861fdc4924
Revises: 3d77a4fe73be
Create Date: 2026-10-28 06:33:56.542964
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

revision: str = "4b861fdc4924"
down_revision: str | Sequence[str] | None = "3d77a4fe73be"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_runs",
        sa.Column("agent", sa.String(length=16), nullable=False),
        sa.Column("goal", sa.Text(), nullable=False),
        sa.Column("planner", sa.String(length=8), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column(
            "subject", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
        sa.Column(
            "usage", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("parent_run_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_agent_runs")),
    )
    op.create_index(op.f("ix_agent_runs_agent"), "agent_runs", ["agent"], unique=False)
    op.create_index(op.f("ix_agent_runs_created_at"), "agent_runs", ["created_at"], unique=False)
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_app_settings")),
    )
    op.create_geospatial_table(
        "buildings",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("osm_id", sa.String(length=32), nullable=True),
        sa.Column(
            "geom",
            Geometry(
                srid=4326,
                dimension=2,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
                nullable=False,
            ),
            nullable=False,
        ),
        sa.Column("height_m", sa.Double(), nullable=False),
        sa.Column("levels", sa.Integer(), nullable=True),
        sa.Column("height_source", sa.String(length=16), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=True),
        sa.Column("added_by", sa.String(length=16), server_default="osm", nullable=False),
        sa.Column("world_change_id", sa.Uuid(), nullable=True),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_buildings")),
        sa.UniqueConstraint("osm_id", name=op.f("uq_buildings_osm_id")),
    )
    op.create_geospatial_index(
        "idx_buildings_geom",
        "buildings",
        ["geom"],
        unique=False,
        postgresql_using="gist",
        postgresql_ops={},
    )
    op.create_table(
        "characteristics",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("definition", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_characteristics")),
    )
    op.create_table(
        "demand_daily",
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("district", sa.String(length=32), nullable=False),
        sa.Column("characteristic", sa.String(length=64), nullable=False),
        sa.Column("count", sa.Integer(), server_default="0", nullable=False),
        sa.PrimaryKeyConstraint("day", "district", "characteristic", name=op.f("pk_demand_daily")),
    )
    op.create_geospatial_table(
        "hotels",
        sa.Column("osm_id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("district", sa.String(length=32), nullable=False),
        sa.Column("tourism", sa.String(length=32), nullable=False),
        sa.Column("stars", sa.Integer(), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column(
            "location",
            Geometry(
                geometry_type="POINT",
                srid=4326,
                dimension=2,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
                nullable=False,
            ),
            nullable=False,
        ),
        sa.Column("building_osm_id", sa.String(length=32), nullable=True),
        sa.Column(
            "footprint",
            Geometry(
                srid=4326,
                dimension=2,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
                nullable=False,
            ),
            nullable=False,
        ),
        sa.Column("height_m", sa.Double(), nullable=False),
        sa.Column("floors", sa.Integer(), nullable=False),
        sa.Column("height_source", sa.String(length=16), nullable=False),
        sa.Column("ground_m", sa.Double(), server_default="0", nullable=False),
        sa.Column("facades", postgresql.ARRAY(sa.String(length=2)), nullable=False),
        sa.Column(
            "demo", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
        sa.Column("price_from_demo", sa.Integer(), nullable=True),
        sa.Column("osm_timestamp", sa.String(length=32), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_hotels")),
        sa.UniqueConstraint("osm_id", name=op.f("uq_hotels_osm_id")),
    )
    op.create_geospatial_index(
        "idx_hotels_footprint",
        "hotels",
        ["footprint"],
        unique=False,
        postgresql_using="gist",
        postgresql_ops={},
    )
    op.create_geospatial_index(
        "idx_hotels_location",
        "hotels",
        ["location"],
        unique=False,
        postgresql_using="gist",
        postgresql_ops={},
    )
    op.create_index(op.f("ix_hotels_district"), "hotels", ["district"], unique=False)
    op.create_table(
        "llm_cache",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("task", sa.String(length=64), nullable=False),
        sa.Column("output", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("usage", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_llm_cache")),
    )
    op.create_geospatial_table(
        "osm_features",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("osm_id", sa.String(length=32), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "geom",
            Geometry(
                srid=4326,
                dimension=2,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
                nullable=False,
            ),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_osm_features")),
    )
    op.create_geospatial_index(
        "idx_osm_features_geom",
        "osm_features",
        ["geom"],
        unique=False,
        postgresql_using="gist",
        postgresql_ops={},
    )
    op.create_index(op.f("ix_osm_features_kind"), "osm_features", ["kind"], unique=False)
    op.create_index(op.f("ix_osm_features_osm_id"), "osm_features", ["osm_id"], unique=False)
    op.create_index(
        "ix_osm_features_tags", "osm_features", ["tags"], unique=False, postgresql_using="gin"
    )
    op.create_table(
        "quality_reports",
        sa.Column("report", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quality_reports")),
    )
    op.create_table(
        "seed_state",
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("version", sa.String(length=128), nullable=False),
        sa.Column(
            "applied_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("name", name=op.f("pk_seed_state")),
    )
    op.create_geospatial_table(
        "world_changes",
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column(
            "geom",
            Geometry(
                srid=4326,
                dimension=2,
                spatial_index=False,
                from_text="ST_GeomFromEWKT",
                name="geometry",
                nullable=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "payload", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
        sa.Column("affected_hotels", postgresql.ARRAY(sa.Uuid()), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("reverted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_world_changes")),
    )
    op.create_geospatial_index(
        "idx_world_changes_geom",
        "world_changes",
        ["geom"],
        unique=False,
        postgresql_using="gist",
        postgresql_ops={},
    )
    op.create_table(
        "agent_steps",
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("tool", sa.String(length=64), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("args", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("output", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["agent_runs.id"],
            name=op.f("fk_agent_steps_run_id_agent_runs"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("run_id", "seq", name=op.f("pk_agent_steps")),
    )
    op.create_table(
        "bookings",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("hotel_id", sa.Uuid(), nullable=False),
        sa.Column("room_type_id", sa.String(length=64), nullable=False),
        sa.Column("rate_plan_id", sa.String(length=64), nullable=False),
        sa.Column("check_in", sa.Date(), nullable=False),
        sa.Column("check_out", sa.Date(), nullable=False),
        sa.Column("adults", sa.Integer(), nullable=False),
        sa.Column("children", sa.Integer(), server_default="0", nullable=False),
        sa.Column("request", sa.Text(), nullable=False),
        sa.Column("promised", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("hotel_reply", sa.Text(), nullable=True),
        sa.Column("price_demo", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["hotel_id"],
            ["hotels.id"],
            name=op.f("fk_bookings_hotel_id_hotels"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_bookings_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_bookings")),
    )
    op.create_index(op.f("ix_bookings_hotel_id"), "bookings", ["hotel_id"], unique=False)
    op.create_index(op.f("ix_bookings_user_id"), "bookings", ["user_id"], unique=False)
    op.create_table(
        "conflicts",
        sa.Column("hotel_id", sa.Uuid(), nullable=False),
        sa.Column("characteristic", sa.String(length=64), nullable=False),
        sa.Column("claims", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("rule", sa.String(length=16), nullable=False),
        sa.Column("resolution", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("cells", sa.Integer(), server_default="0", nullable=False),
        sa.Column("question_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["hotel_id"],
            ["hotels.id"],
            name=op.f("fk_conflicts_hotel_id_hotels"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_conflicts")),
    )
    op.create_index("ix_conflicts_pair", "conflicts", ["hotel_id", "characteristic"], unique=False)
    op.create_table(
        "fact_versions",
        sa.Column("fact_id", sa.Uuid(), nullable=False),
        sa.Column("hotel_id", sa.Uuid(), nullable=False),
        sa.Column("characteristic", sa.String(length=64), nullable=False),
        sa.Column("scope_key", sa.String(length=255), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("confidence", sa.Double(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column(
            "at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["hotel_id"],
            ["hotels.id"],
            name=op.f("fk_fact_versions_hotel_id_hotels"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_fact_versions")),
    )
    op.create_index(op.f("ix_fact_versions_fact_id"), "fact_versions", ["fact_id"], unique=False)
    op.create_index(
        "ix_fact_versions_pair", "fact_versions", ["hotel_id", "characteristic"], unique=False
    )
    op.create_table(
        "facts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("hotel_id", sa.Uuid(), nullable=False),
        sa.Column("characteristic", sa.String(length=64), nullable=False),
        sa.Column("scope", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("scope_key", sa.String(length=255), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("confidence", sa.Double(), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("scope_text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("source_label", sa.String(length=128), nullable=False),
        sa.Column("method", sa.Text(), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("caveats", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("observation_ids", postgresql.ARRAY(sa.Uuid()), nullable=False),
        sa.Column("conflict_id", sa.Uuid(), nullable=True),
        sa.Column("is_demo", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["hotel_id"], ["hotels.id"], name=op.f("fk_facts_hotel_id_hotels"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_facts")),
        sa.UniqueConstraint(
            "hotel_id", "characteristic", "scope_key", name=op.f("uq_facts_hotel_id")
        ),
    )
    op.create_index(op.f("ix_facts_characteristic"), "facts", ["characteristic"], unique=False)
    op.create_table(
        "hotel_staff",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("hotel_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["hotel_id"],
            ["hotels.id"],
            name=op.f("fk_hotel_staff_hotel_id_hotels"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_hotel_staff_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("user_id", "hotel_id", name=op.f("pk_hotel_staff")),
    )
    op.create_table(
        "hotelier_questions",
        sa.Column("hotel_id", sa.Uuid(), nullable=False),
        sa.Column("characteristic", sa.String(length=64), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("why", sa.Text(), nullable=False),
        sa.Column("value", sa.Double(), nullable=False),
        sa.Column("answer_kind", sa.String(length=16), nullable=False),
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "context", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
        sa.Column("status", sa.String(length=16), server_default="open", nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["hotel_id"],
            ["hotels.id"],
            name=op.f("fk_hotelier_questions_hotel_id_hotels"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_hotelier_questions")),
    )
    op.create_index(
        op.f("ix_hotelier_questions_hotel_id"), "hotelier_questions", ["hotel_id"], unique=False
    )
    op.create_index(
        "uq_hotelier_questions_open",
        "hotelier_questions",
        ["hotel_id", "characteristic"],
        unique=True,
        postgresql_where=sa.text("status = 'open'"),
    )
    op.create_table(
        "notifications",
        sa.Column("audience", sa.String(length=16), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("hotel_id", sa.Uuid(), nullable=True),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("link", sa.String(length=255), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["hotel_id"],
            ["hotels.id"],
            name=op.f("fk_notifications_hotel_id_hotels"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_notifications_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notifications")),
    )
    op.create_index(op.f("ix_notifications_hotel_id"), "notifications", ["hotel_id"], unique=False)
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)
    op.create_table(
        "observations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("hotel_id", sa.Uuid(), nullable=False),
        sa.Column("characteristic", sa.String(length=64), nullable=False),
        sa.Column("characteristic_version", sa.Integer(), nullable=False),
        sa.Column("scope", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("scope_key", sa.String(length=255), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("confidence", sa.Double(), nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("source_ref", sa.String(length=255), nullable=False),
        sa.Column("method", sa.Text(), nullable=False),
        sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("caveats", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column("is_demo", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["hotel_id"],
            ["hotels.id"],
            name=op.f("fk_observations_hotel_id_hotels"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_observations")),
    )
    op.create_index(
        "ix_observations_pair",
        "observations",
        ["hotel_id", "characteristic", "observed_at"],
        unique=False,
    )
    op.create_table(
        "room_types",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("hotel_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("area", sa.Double(), nullable=False),
        sa.Column("bed", sa.String(length=64), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("rates", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(
            ["hotel_id"],
            ["hotels.id"],
            name=op.f("fk_room_types_hotel_id_hotels"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_room_types")),
    )
    op.create_index(op.f("ix_room_types_hotel_id"), "room_types", ["hotel_id"], unique=False)
    op.create_table(
        "searches",
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("intent", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "result", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_searches_user_id_users"), ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_searches")),
    )
    op.create_table(
        "taste_profiles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "overrides",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_taste_profiles_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_taste_profiles")),
    )
    op.create_table(
        "user_events",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_user_events_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_events")),
    )
    op.create_index(op.f("ix_user_events_user_id"), "user_events", ["user_id"], unique=False)
    op.create_table(
        "facade_rooms",
        sa.Column("hotel_id", sa.Uuid(), nullable=False),
        sa.Column("room_type_id", sa.String(length=64), nullable=False),
        sa.Column("facade", sa.String(length=2), nullable=False),
        sa.Column("floor_from", sa.Integer(), nullable=False),
        sa.Column("floor_to", sa.Integer(), nullable=False),
        sa.Column("confirmed_by_hotel", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["hotel_id"],
            ["hotels.id"],
            name=op.f("fk_facade_rooms_hotel_id_hotels"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["room_type_id"],
            ["room_types.id"],
            name=op.f("fk_facade_rooms_room_type_id_room_types"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_facade_rooms")),
    )
    op.create_index(op.f("ix_facade_rooms_hotel_id"), "facade_rooms", ["hotel_id"], unique=False)
    op.create_table(
        "hotelier_answers",
        sa.Column("question_id", sa.Uuid(), nullable=False),
        sa.Column("hotel_id", sa.Uuid(), nullable=False),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column(
            "payload", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
        sa.Column(
            "parsed", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False
        ),
        sa.Column("parse_confidence", sa.Double(), nullable=False),
        sa.Column("parser", sa.String(length=8), nullable=False),
        sa.Column("author", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["hotel_id"],
            ["hotels.id"],
            name=op.f("fk_hotelier_answers_hotel_id_hotels"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["question_id"],
            ["hotelier_questions.id"],
            name=op.f("fk_hotelier_answers_question_id_hotelier_questions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_hotelier_answers")),
    )
    op.create_index(
        op.f("ix_hotelier_answers_question_id"), "hotelier_answers", ["question_id"], unique=False
    )
    op.create_table(
        "trip_feedback",
        sa.Column("booking_id", sa.Uuid(), nullable=False),
        sa.Column("fact_id", sa.Uuid(), nullable=False),
        sa.Column("characteristic", sa.String(length=64), nullable=False),
        sa.Column("answer", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["booking_id"],
            ["bookings.id"],
            name=op.f("fk_trip_feedback_booking_id_bookings"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_trip_feedback")),
    )


def downgrade() -> None:
    op.drop_table("trip_feedback")
    op.drop_index(op.f("ix_hotelier_answers_question_id"), table_name="hotelier_answers")
    op.drop_table("hotelier_answers")
    op.drop_index(op.f("ix_facade_rooms_hotel_id"), table_name="facade_rooms")
    op.drop_table("facade_rooms")
    op.drop_index(op.f("ix_user_events_user_id"), table_name="user_events")
    op.drop_table("user_events")
    op.drop_table("taste_profiles")
    op.drop_table("searches")
    op.drop_index(op.f("ix_room_types_hotel_id"), table_name="room_types")
    op.drop_table("room_types")
    op.drop_index("ix_observations_pair", table_name="observations")
    op.drop_table("observations")
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_hotel_id"), table_name="notifications")
    op.drop_table("notifications")
    op.drop_index(
        "uq_hotelier_questions_open",
        table_name="hotelier_questions",
        postgresql_where=sa.text("status = 'open'"),
    )
    op.drop_index(op.f("ix_hotelier_questions_hotel_id"), table_name="hotelier_questions")
    op.drop_table("hotelier_questions")
    op.drop_table("hotel_staff")
    op.drop_index(op.f("ix_facts_characteristic"), table_name="facts")
    op.drop_table("facts")
    op.drop_index("ix_fact_versions_pair", table_name="fact_versions")
    op.drop_index(op.f("ix_fact_versions_fact_id"), table_name="fact_versions")
    op.drop_table("fact_versions")
    op.drop_index("ix_conflicts_pair", table_name="conflicts")
    op.drop_table("conflicts")
    op.drop_index(op.f("ix_bookings_user_id"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_hotel_id"), table_name="bookings")
    op.drop_table("bookings")
    op.drop_table("agent_steps")
    op.drop_geospatial_index(
        "idx_world_changes_geom",
        table_name="world_changes",
        postgresql_using="gist",
        column_name="geom",
    )
    op.drop_geospatial_table("world_changes")
    op.drop_table("seed_state")
    op.drop_table("quality_reports")
    op.drop_index("ix_osm_features_tags", table_name="osm_features", postgresql_using="gin")
    op.drop_index(op.f("ix_osm_features_osm_id"), table_name="osm_features")
    op.drop_index(op.f("ix_osm_features_kind"), table_name="osm_features")
    op.drop_geospatial_index(
        "idx_osm_features_geom",
        table_name="osm_features",
        postgresql_using="gist",
        column_name="geom",
    )
    op.drop_geospatial_table("osm_features")
    op.drop_table("llm_cache")
    op.drop_index(op.f("ix_hotels_district"), table_name="hotels")
    op.drop_geospatial_index(
        "idx_hotels_location", table_name="hotels", postgresql_using="gist", column_name="location"
    )
    op.drop_geospatial_index(
        "idx_hotels_footprint",
        table_name="hotels",
        postgresql_using="gist",
        column_name="footprint",
    )
    op.drop_geospatial_table("hotels")
    op.drop_table("demand_daily")
    op.drop_table("characteristics")
    op.drop_geospatial_index(
        "idx_buildings_geom", table_name="buildings", postgresql_using="gist", column_name="geom"
    )
    op.drop_geospatial_table("buildings")
    op.drop_table("app_settings")
    op.drop_index(op.f("ix_agent_runs_created_at"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_agent"), table_name="agent_runs")
    op.drop_table("agent_runs")
