from collections.abc import Awaitable, Callable

from app.domain.agents import Planner
from app.service.agents.runtime import Tracer
from app.service.ports import LanguageModel, LlmUnavailableError


async def with_fallback[T](
    llm: LanguageModel | None,
    primary: Callable[[LanguageModel], Awaitable[T]],
    fallback: Callable[[], Awaitable[T]],
    *,
    tracer: Tracer | None = None,
) -> tuple[T, Planner]:
    if llm is not None and llm.available:
        try:
            result = await primary(llm)
            if tracer is not None:
                await tracer.set_planner(Planner.LLM)
            return result, Planner.LLM
        except LlmUnavailableError as exc:
            if tracer is not None:
                await tracer.decide(f"LLM недоступна ({exc}), работаю по правилам")
    elif tracer is not None:
        await tracer.reason("LLM не подключена - план строят правила")
    if tracer is not None:
        await tracer.set_planner(Planner.RULES)
    return await fallback(), Planner.RULES
