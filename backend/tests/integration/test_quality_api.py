from datetime import timedelta
from pathlib import Path

import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.db.database import Database
from app.service.quality.evaluate import evaluate
from app.service.quality.reports import QualityReports
from tests.factories import FakeClock, promote, register
from tests.integration.conftest import AppFactory

DATA = Path(__file__).resolve().parents[2] / "data"


async def test_evaluation_is_saved_and_console_returns_latest(app_factory: AppFactory) -> None:
    async with app_factory() as (app, client):
        db: Database = app.state.db
        operator = await register(client)
        await promote(db, operator.email)
        headers = operator.headers
        assert (await client.get("/api/v1/console/quality", headers=headers)).status_code == 404
        report = await evaluate(db, DATA, FakeClock())
        assert report["hotelierAnswers"]["rules"]["total_fields"] == 72
        assert report["gold"]["status"] == "эталон не размечен"
        assert report["ndcg10"] is None
        assert report["knowledge"]["facts"] == 0
        assert report["llmStatus"] == "не запускался"
        newer_at = FakeClock().now() + timedelta(days=1)
        newer = {**report, "generatedAt": newer_at.isoformat()}
        async with db.unit_of_work() as uow:
            await QualityReports(uow).save(newer, newer_at)
        response = await client.get("/api/v1/console/quality", headers=headers)
        assert response.status_code == 200, response.text
        assert response.json()["generatedAt"].startswith(newer["generatedAt"][:19])
        assert response.json()["parseAccuracy"]["rules"] == 1
        assert response.json()["search"]["evaluated"] == 0


async def test_quality_requires_console_permission(app_factory: AppFactory) -> None:
    async with app_factory() as (_, client):
        guest = await register(client)
        assert (await client.get("/api/v1/console/quality")).status_code == 401
        response = await client.get("/api/v1/console/quality", headers=guest.headers)
        assert response.status_code == 403


async def test_llm_flag_requires_available_model(settings: Settings) -> None:
    from app.quality_cli import evaluate_quality  # noqa: PLC0415

    with pytest.raises(ValueError, match="--llm"):
        await evaluate_quality(settings, use_llm=True)


async def test_cli_default_never_builds_llm_even_with_a_key(
    settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app import quality_cli  # noqa: PLC0415

    def reject(*args: object, **kwargs: object) -> None:
        raise AssertionError("Default evaluation must not construct the paid adapter")

    monkeypatch.setattr(quality_cli, "build_language_model", reject)
    configured = settings.model_copy(update={"llm_api_key": SecretStr("fake"), "llm_model": "fake"})
    assert configured.llm_enabled
    table = await quality_cli.evaluate_quality(configured)
    assert "не запускался" in table
