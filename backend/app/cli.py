import argparse
import asyncio
import getpass
import json
import logging
import os
from collections.abc import Sequence

from app.bootstrap import build_agents
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.security.passwords import hash_password
from app.db.database import Database
from app.db.models import User
from app.domain.catalog import hotel_id
from app.domain.users import Role, normalize_email
from app.service.agents.collect import CollectService
from app.service.ports import RecordingEventBus, SystemClock
from app.service.seed_export import export_tables


async def create_operator(email: str, password: str) -> str:
    """Create an operator or promote an existing account. Returns what happened."""
    db = Database(get_settings())
    try:
        async with db.unit_of_work() as uow:
            email = normalize_email(email)
            user = await uow.users.get_by_email(email)
            if user is not None:
                user.role = Role.OPERATOR
                return f"{email} promoted to operator"
            uow.users.add(
                User(email=email, password_hash=await hash_password(password), role=Role.OPERATOR)
            )
            return f"operator {email} created"
    finally:
        await db.dispose()


async def collect(
    settings: Settings, osm_ids: Sequence[str], keys: Sequence[str] | None, concurrency: int
) -> str:
    db = Database(settings)
    clock = SystemClock()
    try:
        agents = build_agents(db, RecordingEventBus(), clock, settings.data_dir)
        service = CollectService(db, agents.researcher, agents.runner, clock)
        ids = [hotel_id(o) for o in osm_ids] or None
        changed = await service.collect(ids, keys, concurrency=concurrency)
        return f"collect finished: {changed} facts changed"
    finally:
        await db.dispose()


async def export_seed(settings: Settings) -> str:
    db = Database(settings)
    try:
        counts = await export_tables(db, settings.data_dir / "seed")
        return "exported " + ", ".join(f"{t}: {n}" for t, n in counts.items())
    finally:
        await db.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    operator = commands.add_parser("create-operator", help="create or promote an operator")
    operator.add_argument("email")
    run = commands.add_parser("collect", help="agents research hotels and record facts")
    run.add_argument("--all", action="store_true", help="every hotel (default when no --hotel)")
    run.add_argument("--hotel", action="append", default=[], help="OSM id, e.g. way/227214566")
    run.add_argument("--keys", help="comma-separated characteristics, default: all published")
    run.add_argument("--concurrency", type=int, default=4)
    commands.add_parser("export-seed", help="dump knowledge and traces into data/seed")
    commands.add_parser("openapi", help="print the OpenAPI schema")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(settings.log_level, as_json=settings.log_json)
    logging.getLogger("app").setLevel(logging.INFO)
    if args.command == "create-operator":
        password = os.environ.get("OPERATOR_PASSWORD") or getpass.getpass("Password: ")
        result = asyncio.run(create_operator(args.email, password))
    elif args.command == "collect":
        keys = args.keys.split(",") if args.keys else None
        result = asyncio.run(collect(settings, args.hotel, keys, args.concurrency))
    elif args.command == "export-seed":
        result = asyncio.run(export_seed(settings))
    else:
        from app.main import create_app  # noqa: PLC0415 - only this command needs the API

        result = json.dumps(create_app(settings).openapi(), indent=2, ensure_ascii=False)
    print(result)  # noqa: T201 - CLI output


if __name__ == "__main__":
    main()
