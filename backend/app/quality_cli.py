from redis.asyncio import Redis

from app.bootstrap import build_language_model
from app.core.config import Settings
from app.db.database import Database
from app.service.ports import SystemClock
from app.service.quality.evaluate import evaluate
from app.service.quality.printing import report_table


async def evaluate_quality(settings: Settings, *, use_llm: bool = False) -> str:
    if use_llm and not settings.llm_enabled:
        raise ValueError("--llm требует настроенную модель и LLM_MODE=auto")
    db = Database(settings)
    redis = Redis.from_url(settings.redis_url) if use_llm else None
    try:
        llm = build_language_model(settings, db, redis) if use_llm else None
        return report_table(await evaluate(db, settings.data_dir, SystemClock(), llm=llm))
    finally:
        if redis is not None:
            await redis.aclose()
        await db.dispose()
