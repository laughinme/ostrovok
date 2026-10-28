from functools import lru_cache
from pathlib import Path
from typing import Literal, Self

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
# Compose reads the root `.env`; local runs from `backend/` read the same file, then `backend/.env`.
ENV_FILES = (BASE_DIR.parent / ".env", BASE_DIR / ".env")

DEV_CSRF_KEY = "change-me"


# Reasoning effort; "default" leaves it to the model, "off" asks for none.
LlmThinking = Literal["default", "off", "minimal", "low", "medium", "high"]


class Settings(BaseSettings):
    """
    Application settings. Read once at startup from the environment and `.env`,
    then passed down explicitly: nothing in the app calls `Settings()` on import.
    """

    model_config = SettingsConfigDict(env_file=ENV_FILES, extra="ignore")

    # Stage and diagnostics
    app_stage: Literal["dev", "test", "prod"] = "dev"
    debug: bool = False
    log_level: str = "INFO"
    log_json: bool = False
    sql_echo: bool = False
    api_docs_enabled: bool = True

    # HTTP
    cors_allow_origins: str = ""
    rate_limit_enabled: bool = True
    auth_rate_limit_per_minute: int = 10
    llm_rate_limit_per_minute: int = 30

    # Postgres and Redis
    database_url: str
    db_pool_size: int = 10
    db_max_overflow: int = 10
    redis_url: str

    # Auth
    jwt_private_key: SecretStr | None = None
    jwt_public_key: str | None = None
    jwt_private_key_path: Path | None = None
    jwt_public_key_path: Path | None = None
    jwt_algo: str = "RS256"
    access_ttl: int = 12 * 60 * 60
    refresh_ttl: int = 30 * 24 * 60 * 60
    csrf_hmac_key: SecretStr = SecretStr(DEV_CSRF_KEY)

    # Cookies
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str | None = None

    # LLM: any OpenAI-compatible endpoint; without a key every LLM port falls back to rules
    llm_base_url: str = ""
    llm_api_key: SecretStr = SecretStr("")
    llm_model: str = ""
    llm_model_strong: str = ""
    llm_thinking: LlmThinking = "low"
    llm_thinking_strong: LlmThinking = "medium"
    llm_timeout_sec: float = 15.0
    llm_mode: Literal["auto", "off"] = "auto"
    llm_daily_call_limit: int = 300

    # Demo hotelier simulator
    hotelier_simulator: Literal["on", "off"] = "on"
    simulator_delay_sec: str = "5-30"

    # Region data, registry and seed shipped with the image
    data_dir: Path = BASE_DIR / "data"

    # Background worker
    jobs_batch_size: int = 4
    jobs_poll_interval_sec: float = 0.5
    jobs_lease_sec: int = 120
    jobs_max_attempts: int = 5
    geo_workers: int = 2

    @property
    def show_api_docs(self) -> bool:
        return self.api_docs_enabled

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    @property
    def llm_enabled(self) -> bool:
        return (
            self.llm_mode == "auto"
            and bool(self.llm_api_key.get_secret_value())
            and bool(self.llm_model)
        )

    @property
    def simulator_delay_range(self) -> tuple[float, float]:
        low, _, high = self.simulator_delay_sec.partition("-")
        return float(low), float(high or low)

    @field_validator("cookie_samesite", mode="before")
    @classmethod
    def _normalize_samesite(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("data_dir")
    @classmethod
    def _resolve_data_dir(cls, value: Path) -> Path:
        return _resolve(value)

    @model_validator(mode="after")
    def _load_jwt_keys(self) -> Self:
        if self.jwt_private_key is None and self.jwt_private_key_path is not None:
            self.jwt_private_key = SecretStr(_resolve(self.jwt_private_key_path).read_text())
        if self.jwt_public_key is None and self.jwt_public_key_path is not None:
            self.jwt_public_key = _resolve(self.jwt_public_key_path).read_text()
        if self.jwt_private_key is None or self.jwt_public_key is None:
            raise ValueError("JWT keys are required: set JWT_PRIVATE_KEY/JWT_PUBLIC_KEY or *_PATH")
        return self

    @model_validator(mode="after")
    def _refuse_unsafe_production(self) -> Self:
        if self.app_stage != "prod":
            return self

        problems = []
        if self.csrf_hmac_key.get_secret_value() == DEV_CSRF_KEY:
            problems.append("CSRF_HMAC_KEY still has the development value")
        if self.debug:
            problems.append("DEBUG must be false")
        if problems:
            raise ValueError("Unsafe production settings: " + "; ".join(problems))
        return self


def _resolve(path: Path) -> Path:
    return path if path.is_absolute() else BASE_DIR / path


class MigrationSettings(BaseSettings):
    """Alembic and the seed loader need only the database URL, not JWT keys and the rest."""

    model_config = SettingsConfigDict(env_file=ENV_FILES, extra="ignore")

    database_url: str
    data_dir: Path = BASE_DIR / "data"


@lru_cache
def get_settings() -> Settings:
    """Entrypoints only (app factory, worker, CLI, alembic); everything else receives settings."""
    return Settings()
