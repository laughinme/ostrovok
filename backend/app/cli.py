import argparse
import asyncio
import getpass
import os

from app.core.config import get_settings
from app.core.security.passwords import hash_password
from app.db.database import Database
from app.db.models import User
from app.domain.users import Role, normalize_email


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


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    operator = commands.add_parser(
        "create-operator", help="create an operator or promote an existing user"
    )
    operator.add_argument("email")
    args = parser.parse_args()

    if args.command == "create-operator":
        password = os.environ.get("ADMIN_PASSWORD") or getpass.getpass("Password: ")
        print(asyncio.run(create_operator(args.email, password)))  # noqa: T201 - CLI output


if __name__ == "__main__":
    main()
