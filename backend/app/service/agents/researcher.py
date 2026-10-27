"""
The Researcher (09 §4.2): for a hotel, take each characteristic's recipe, run its method,
fall back when data is missing, and record observations. No LLM: the plan is the recipe.
"""

from collections.abc import Mapping, Sequence
from datetime import timedelta
from uuid import UUID

from app.db.database import Database
from app.domain.catalog import HotelGeo
from app.domain.knowledge.characteristic import Characteristic, CharacteristicStatus, MethodKind
from app.domain.knowledge.observation import Observation
from app.service.agents.runtime import Tracer
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import Registry, validate_recipe
from app.service.ports import EventBus
from app.service.recipes.executor import (
    Environment,
    Finding,
    MethodCall,
    MethodExecutor,
    NoDataError,
)

HOTEL_CHANNEL = "hotel:{}"
FACTS_CHANNEL = "facts"
# Facts that read other facts go last, after what they depend on is known.
_LAST = (MethodKind.DERIVED,)


def to_observation(
    finding: Finding,
    hotel: HotelGeo,
    characteristic: Characteristic,
    env: Environment,
    run_id: UUID | None,
) -> Observation:
    now = env.clock.now()
    return Observation(
        hotel_id=hotel.id,
        characteristic=characteristic.key,
        characteristic_version=characteristic.version,
        scope=finding.scope,
        value=finding.value,
        confidence=finding.confidence,
        source=finding.source,
        source_ref=finding.source_ref,
        method=finding.method,
        observed_at=now,
        valid_until=now + timedelta(days=characteristic.ttl_days),
        evidence=finding.evidence,
        caveats=finding.caveats,
        run_id=run_id,
        is_demo=finding.is_demo,
    )


class Researcher:
    def __init__(
        self,
        db: Database,
        env: Environment,
        executors: Mapping[MethodKind, MethodExecutor],
        events: EventBus,
    ) -> None:
        self._db = db
        self._env = env
        self._executors = executors
        self._events = events

    async def characteristics(
        self, keys: Sequence[str] | None = None, *, include_provisional: bool = False
    ) -> list[Characteristic]:
        async with self._db.unit_of_work() as uow:
            items = await Registry(uow).all()
        allowed = {CharacteristicStatus.PUBLISHED}
        if include_provisional or keys:
            allowed.add(CharacteristicStatus.PROVISIONAL)
        chosen = [c for c in items if c.status in allowed and (keys is None or c.key in keys)]
        return sorted(chosen, key=lambda c: (c.method in _LAST, c.key))

    async def study(
        self, hotel: HotelGeo, characteristics: Sequence[Characteristic], tracer: Tracer
    ) -> int:
        """Research one hotel; returns how many facts changed."""
        await tracer.reason(
            f"Изучаю «{hotel.name}» ({hotel.floors} эт., стороны: "
            f"{', '.join(f.value for f in hotel.facades)}): {len(characteristics)} характеристик"
        )
        changed = 0
        for characteristic in characteristics:
            changed += await self._one(hotel, characteristic, tracer)
        await tracer.decide(f"Готово: изменилось фактов — {changed}")
        return changed

    async def _one(self, hotel: HotelGeo, characteristic: Characteristic, tracer: Tracer) -> int:
        if characteristic.method is MethodKind.ASK_HOTELIER:
            return 0  # the Liaison asks hotels; the Researcher only computes
        executor = self._executors.get(characteristic.method)
        if executor is None:
            await tracer.decide(
                f"{characteristic.title}: метод «{characteristic.method}» пока не подключён"
            )
            return 0
        call = MethodCall(hotel, characteristic, validate_recipe(characteristic.recipe), tracer)
        try:
            findings = await executor.collect(call, self._env)
        except NoDataError as exc:
            await tracer.decide(f"{characteristic.title}: {exc} — оставляем «не знаем»")
            return 0
        observations = [
            to_observation(f, hotel, characteristic, self._env, tracer.run_id) for f in findings
        ]
        async with self._db.unit_of_work() as uow:
            recorded = await KnowledgeStore(uow, self._env.clock).record(
                observations, reason=f"расчёт агента: {characteristic.title}", run_id=tracer.run_id
            )
        for fact in recorded.changed_facts:
            event = {
                "type": "fact.changed",
                "hotelId": str(fact.hotel_id),
                "characteristic": fact.characteristic,
                "factId": str(fact.id),
            }
            await self._events.publish(HOTEL_CHANNEL.format(fact.hotel_id), event)
            await self._events.publish(FACTS_CHANNEL, event)
        if recorded.changed_facts:
            first = recorded.changed_facts[0]
            await tracer.result(
                f"{characteristic.title}: {first.statement} · {first.scope_text} "
                f"({first.confidence_label.value})"
                + (
                    f" и ещё {len(recorded.changed_facts) - 1}"
                    if len(recorded.changed_facts) > 1
                    else ""
                )
            )
        return len(recorded.changed_facts)
