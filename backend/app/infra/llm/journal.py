import logging
from collections.abc import Sequence
from decimal import Decimal
from typing import Any

from genai_prices import Usage as PriceUsage
from genai_prices import calc_price
from pydantic_ai import ModelMessage, ToolCallPart, ToolReturnPart
from pydantic_core import to_jsonable_python

from app.db.database import Database
from app.db.models import LlmCallRow
from app.service.ports import Usage

logger = logging.getLogger(__name__)

PROMPT_MAX = 4000
PRICES = {"gpt-6.1-terra": (1.00, 0.05, 5.00)}


def price_usd(model: str, input_tokens: int, cached_tokens: int, output_tokens: int) -> float:
    usage = PriceUsage(
        input_tokens=input_tokens, cache_read_tokens=cached_tokens, output_tokens=output_tokens
    )
    for ref in dict.fromkeys((model, model.rsplit("/", 1)[-1])):
        if ref in PRICES:
            fresh, cached, out = PRICES[ref]
            uncached = input_tokens - cached_tokens
            return (uncached * fresh + cached_tokens * cached + output_tokens * out) / 1e6
        try:
            return float(calc_price(usage, model_ref=ref).total_price)
        except LookupError:
            continue
    return 0.0


def run_cost(model: str, reported: Decimal | None, usage: Usage) -> float:
    if reported is not None:
        return float(reported)
    return price_usd(model, usage.input_tokens, usage.cached_tokens, usage.output_tokens)


def tool_calls(messages: Sequence[ModelMessage], names: set[str]) -> list[dict[str, Any]]:
    calls: dict[str, dict[str, Any]] = {}
    for message in messages:
        for part in message.parts:
            if isinstance(part, ToolCallPart) and part.tool_name in names:
                calls[part.tool_call_id] = {
                    "tool": part.tool_name,
                    "args": part.args_as_dict(),
                    "result": None,
                }
            elif isinstance(part, ToolReturnPart) and part.tool_call_id in calls:
                calls[part.tool_call_id]["result"] = to_jsonable_python(part.content, fallback=str)
    return list(calls.values())


class LlmJournal:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def write(
        self,
        *,
        task: str,
        model: str,
        status: str,
        prompt: str,
        output: Any = None,
        calls: Sequence[dict[str, Any]] = (),
        usage: Usage | None = None,
        latency_ms: int = 0,
        error: str | None = None,
    ) -> None:
        usage = usage or Usage()
        try:
            async with self._db.unit_of_work() as uow:
                uow.session.add(
                    LlmCallRow(
                        task=task,
                        model=model,
                        status=status,
                        prompt=prompt[:PROMPT_MAX],
                        output=output,
                        tool_calls=list(calls),
                        usage={
                            "requests": usage.requests,
                            "inputTokens": usage.input_tokens,
                            "cachedTokens": usage.cached_tokens,
                            "outputTokens": usage.output_tokens,
                        },
                        cost_usd=usage.cost_usd,
                        latency_ms=latency_ms,
                        error=error[:1000] if error else None,
                    )
                )
        except Exception:
            logger.warning("LLM journal write failed", exc_info=True)
