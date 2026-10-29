import asyncio
import logging
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.config import BASE_DIR, MigrationSettings
from app.core.logging import configure_logging
from app.db.database import Database
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders

logger = logging.getLogger("app.init")


def ensure_jwt_keys(private_path: Path, public_path: Path) -> bool:
    if private_path.exists() and public_path.exists():
        return False
    private_path.parent.mkdir(parents=True, exist_ok=True)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    private_path.chmod(0o600)
    public_path.write_bytes(
        key.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        )
    )
    return True


def migrate(database_url: str) -> None:
    config = Config(str(BASE_DIR / "alembic.ini"))
    config.attributes["database_url"] = database_url
    config.attributes["configure_logger"] = False
    command.upgrade(config, "head")


async def seed(settings: MigrationSettings) -> None:
    db = Database.for_url(settings.database_url)
    try:
        await run_seed(db, settings.data_dir, seed_loaders())
    finally:
        await db.dispose()


def main() -> None:
    configure_logging(os.environ.get("LOG_LEVEL", "INFO"), as_json=False)
    settings = MigrationSettings()
    private_path = Path(os.environ.get("JWT_PRIVATE_KEY_PATH", "/keys/jwt_private_key.pem"))
    public_path = Path(os.environ.get("JWT_PUBLIC_KEY_PATH", "/keys/jwt_public_key.pem"))
    if ensure_jwt_keys(private_path, public_path):
        logger.info("generated JWT keys in %s", private_path.parent)
    migrate(settings.database_url)
    logger.info("migrations applied")
    asyncio.run(seed(settings))
    logger.info("init finished")


if __name__ == "__main__":
    main()
