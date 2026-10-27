from collections.abc import Callable

import pytest
from pydantic import SecretStr, ValidationError

from app.core.config import Settings


def test_production_refuses_development_secrets(make_settings: Callable[..., Settings]) -> None:
    with pytest.raises(ValidationError, match="Unsafe production settings"):
        make_settings(app_stage="prod", debug=False, csrf_hmac_key=SecretStr("change-me"))


def test_production_accepts_real_secrets(make_settings: Callable[..., Settings]) -> None:
    settings = make_settings(
        app_stage="prod",
        debug=False,
        cookie_secure=True,
        csrf_hmac_key=SecretStr("a-long-random-value"),
    )

    assert settings.app_stage == "prod"


def test_jwt_keys_are_required(make_settings: Callable[..., Settings]) -> None:
    with pytest.raises(ValidationError, match="JWT keys are required"):
        make_settings(jwt_private_key=None, jwt_public_key=None)


def test_cors_origins_are_split(make_settings: Callable[..., Settings]) -> None:
    settings = make_settings(cors_allow_origins="http://a.test, http://b.test,")

    assert settings.cors_origins == ["http://a.test", "http://b.test"]


def test_llm_is_off_without_a_key(make_settings: Callable[..., Settings]) -> None:
    assert not make_settings(llm_model="gpt-5-nano").llm_enabled
    assert not make_settings(llm_api_key=SecretStr("k"), llm_model="m", llm_mode="off").llm_enabled
    assert make_settings(llm_api_key=SecretStr("k"), llm_model="m").llm_enabled


def test_simulator_delay_range(make_settings: Callable[..., Settings]) -> None:
    assert make_settings(simulator_delay_sec="5-30").simulator_delay_range == (5.0, 30.0)
    assert make_settings(simulator_delay_sec="2").simulator_delay_range == (2.0, 2.0)
