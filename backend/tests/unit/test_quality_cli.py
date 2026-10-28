from pathlib import Path

import pytest
from pydantic import ValidationError

from app import quality_cli
from app.core.config import Settings
from app.quality_cli import eval_settings, run_label


def test_eval_key_can_be_loaded_from_dotenv(
    settings: Settings, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    env = tmp_path / ".env"
    env.write_text("TEST_PROVIDER_KEY=local-test-value\n")
    monkeypatch.setattr(quality_cli, "ENV_FILES", (env,))
    monkeypatch.delenv("TEST_PROVIDER_KEY", raising=False)
    result = eval_settings(settings, {"key_env": "TEST_PROVIDER_KEY"})
    assert result.llm_api_key.get_secret_value() == "local-test-value"
    monkeypatch.setenv("TEST_PROVIDER_KEY", "environment-value")
    result = eval_settings(settings, {"key_env": "TEST_PROVIDER_KEY"})
    assert result.llm_api_key.get_secret_value() == "environment-value"


def test_eval_validates_overrides(settings: Settings) -> None:
    with pytest.raises(ValidationError):
        eval_settings(settings, {"llm_thinking": "invalid"})
    with pytest.raises(ValueError, match="не задана"):
        eval_settings(settings, {"key_env": "MISSING_EVAL_KEY_FOR_TEST"})


def test_report_names_include_provider(settings: Settings) -> None:
    a = settings.model_copy(update={"llm_base_url": "https://first.example/v1"})
    b = settings.model_copy(update={"llm_base_url": "https://second.example/v1"})
    assert run_label(a) != run_label(b)
