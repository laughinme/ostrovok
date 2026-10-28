import hashlib
import json
import os
from pathlib import Path
from typing import Any

from dotenv import dotenv_values
from pydantic import SecretStr

from app.bootstrap import build_environment, build_language_model, default_executors
from app.core.config import ENV_FILES, Settings
from app.db.database import Database
from app.service.agents.curator import Curator
from app.service.ports import LanguageModel, SystemClock
from app.service.quality.evaluate import evaluate
from app.service.quality.llm_eval import evaluate_llm
from app.service.quality.printing import comparison_table, llm_table, report_table
from app.service.recipes.executor import executors_by_method

EVAL_CALL_LIMIT = 5000


def eval_settings(settings: Settings, overrides: dict[str, Any]) -> Settings:
    """Model, endpoint and key for one comparison run; the key comes from a named env variable."""
    update = {k: v for k, v in overrides.items() if v and k != "key_env"}
    if key_env := overrides.get("key_env"):
        values = {k: v for path in ENV_FILES for k, v in dotenv_values(path).items()}
        key = os.environ.get(key_env, values.get(key_env))
        if not key:
            raise ValueError(f"{key_env} не задана в окружении или .env")
        update["llm_api_key"] = SecretStr(key)
    update["llm_daily_call_limit"] = EVAL_CALL_LIMIT
    return Settings.model_validate({**settings.model_dump(), **update})


def run_label(settings: Settings) -> str:
    strong = settings.llm_model_strong or settings.llm_model
    label = f"{settings.llm_model}.{settings.llm_thinking}"
    if (strong, settings.llm_thinking_strong) != (settings.llm_model, settings.llm_thinking):
        label += f"+{strong}.{settings.llm_thinking_strong}"
    endpoint = settings.llm_base_url.rstrip("/") or "https://api.openai.com/v1"
    provider = hashlib.sha256(endpoint.encode()).hexdigest()[:10]
    return f"{label.replace(chr(47), chr(95))}.{provider}"


async def evaluate_quality(
    settings: Settings, *, use_llm: bool = False, overrides: dict[str, Any] | None = None
) -> str:
    settings = eval_settings(settings, overrides or {}) if use_llm else settings
    if use_llm and not settings.llm_enabled:
        raise ValueError("--llm требует настроенную модель и LLM_MODE=auto")
    db = Database(settings)
    clock = SystemClock()
    try:
        llm_report = None
        if use_llm:
            # Without Redis: the evaluation counts its calls locally, not against the app's day.
            fast = build_language_model(settings, db, None)
            strong = build_language_model(settings, db, None, strong=True)
            assert fast is not None  # noqa: S101 - llm_enabled checked above
            assert strong is not None  # noqa: S101

            def make_curator(llm: LanguageModel) -> Curator:
                env = build_environment(db, clock, settings.data_dir)
                executors = dict(executors_by_method(default_executors()))
                return Curator(db, env, executors, llm, settings.data_dir)

            llm_report = await evaluate_llm(
                db, settings.data_dir, clock, fast, strong, make_curator=make_curator
            )
            llm_report["generatedAt"] = clock.now().isoformat()
            llm_report["evaluationVersion"] = 2
            llm_report["model"] = settings.llm_model
            llm_report["strongModel"] = settings.llm_model_strong or settings.llm_model
            llm_report["thinking"] = settings.llm_thinking
            llm_report["thinkingStrong"] = settings.llm_thinking_strong
            llm_report["baseUrl"] = settings.llm_base_url or "https://api.openai.com/v1"
            _save(settings.data_dir / "eval/llm" / f"{run_label(settings)}.json", llm_report)
        report = await evaluate(db, settings.data_dir, clock, llm=llm_report)
        table = report_table(report)
        return f"{table}\n\n{llm_table(llm_report)}" if llm_report else table
    finally:
        await db.dispose()


def compare_runs(data_dir: Path) -> str:
    runs = [
        json.loads(p.read_text(encoding="utf-8"))
        for p in sorted((data_dir / "eval/llm").glob("*.json"))
    ]
    return comparison_table(runs) if runs else "нет прогонов: make eval-llm"


def _save(path: Path, report: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
