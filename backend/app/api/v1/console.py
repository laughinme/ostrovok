"""Ostrovok's knowledge console: registry, agents, conflicts, changes of the world (09 §9)."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import ClockDep, LlmDep, RunQueriesDep, SettingsDep, UowDep, require
from app.api.schemas.agents import AgentRunOut, RunStarted
from app.api.schemas.console import (
    BuildingRequest,
    ConflictOut,
    DemoResetOut,
    LearnRequest,
    LlmCallOut,
    LlmSpendOut,
    LlmUsageOut,
    RegistryLineOut,
    ResolveRequest,
    SettingsModel,
    WorldChangeOut,
    WorldChangeStarted,
)
from app.core.config import Settings
from app.domain.agents import AgentKind
from app.domain.users import Permission
from app.service.console.conflicts import ConflictDesk
from app.service.console.demo import DemoReset
from app.service.console.llm import LlmJournalView, day_start
from app.service.console.publish import start_learning, start_publish
from app.service.console.registry import RegistryStats
from app.service.console.settings import AppSettings
from app.service.console.world import NewBuilding, WorldEditor

router = APIRouter(
    prefix="/console",
    tags=["Console"],
    dependencies=[Depends(require(Permission.CONSOLE_READ))],
)
write = [Depends(require(Permission.CONSOLE_WRITE))]


@router.get(path="/registry", summary="Characteristics with coverage, confidence and freshness")
async def registry(uow: UowDep, clock: ClockDep) -> list[RegistryLineOut]:
    return [RegistryLineOut.from_line(x) for x in await RegistryStats(uow).lines(clock.now())]


@router.post(
    path="/characteristics",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=write,
    summary="Describe a new characteristic in words: the Curator drafts and dry-runs a recipe",
)
async def learn(payload: LearnRequest, uow: UowDep, clock: ClockDep) -> RunStarted:
    return RunStarted(run_id=str(await start_learning(uow, clock, payload.description)))


@router.post(
    path="/characteristics/{key}/publish",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=write,
    summary="Publish a characteristic and compute it for every hotel",
)
async def publish(key: str, uow: UowDep, clock: ClockDep) -> RunStarted:
    return RunStarted(run_id=str(await start_publish(uow, clock, key)))


@router.get(path="/runs", summary="Agent traces with filters")
async def runs(
    svc: RunQueriesDep,
    agent: Annotated[AgentKind | None, Query()] = None,
    hotel: Annotated[UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[AgentRunOut]:
    return [
        AgentRunOut.from_domain(r)
        for r in await svc.recent(agent=agent, hotel_id=hotel, limit=limit)
    ]


@router.get(path="/conflicts", summary="Where sources disagree and how it was resolved")
async def conflicts(
    uow: UowDep, clock: ClockDep, open_only: Annotated[bool, Query(alias="open")] = False
) -> list[ConflictOut]:
    return [
        ConflictOut.from_row(r) for r in await ConflictDesk(uow, clock).list(open_only=open_only)
    ]


@router.post(path="/conflicts/{conflict_id}/resolve", dependencies=write, summary="Resolve by hand")
async def resolve(
    conflict_id: UUID, payload: ResolveRequest, uow: UowDep, clock: ClockDep
) -> ConflictOut:
    return ConflictOut.from_row(
        await ConflictDesk(uow, clock).resolve(conflict_id, payload.resolution)
    )


@router.get(path="/changes", summary="Feed of world changes and what they affected")
async def changes(uow: UowDep, clock: ClockDep) -> list[WorldChangeOut]:
    return [WorldChangeOut.from_row(r) for r in await WorldEditor(uow, clock).feed()]


@router.post(
    path="/world/buildings",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=write,
    summary="«Построили дом»: add a building; the Watcher recomputes nearby hotels",
)
async def add_building(
    payload: BuildingRequest, uow: UowDep, clock: ClockDep
) -> WorldChangeStarted:
    change_id, run_id = await WorldEditor(uow, clock).add_building(
        NewBuilding(
            lon=payload.lon,
            lat=payload.lat,
            floors=payload.floors,
            width_m=payload.width_m,
            depth_m=payload.depth_m,
            title=payload.title,
        )
    )
    return WorldChangeStarted(change_id=str(change_id), run_id=str(run_id))


@router.delete(
    path="/world/buildings/{change_id}",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=write,
    summary="Undo a world change; the Watcher recomputes again",
)
async def revert_building(change_id: UUID, uow: UowDep, clock: ClockDep) -> RunStarted:
    return RunStarted(run_id=str(await WorldEditor(uow, clock).revert(change_id)))


def _settings_out(mode: str, llm: object, settings: Settings) -> SettingsModel:
    on = llm is not None
    return SettingsModel(
        llm_mode=mode,
        llm_available=on,
        llm_model=settings.llm_model if on else None,
        llm_model_strong=(settings.llm_model_strong or settings.llm_model) if on else None,
    )


@router.get(path="/settings", summary="Runtime switches")
async def get_settings(uow: UowDep, llm: LlmDep, settings: SettingsDep) -> SettingsModel:
    return _settings_out(await AppSettings(uow).llm_mode(), llm, settings)


@router.put(path="/settings", dependencies=write, summary="LLM mode: auto or off (rules only)")
async def put_settings(
    payload: SettingsModel, uow: UowDep, llm: LlmDep, settings: SettingsDep
) -> SettingsModel:
    await AppSettings(uow).set_llm_mode(payload.llm_mode)
    return _settings_out(payload.llm_mode, llm, settings)


@router.get(path="/llm/calls", summary="LLM journal: prompt, answer, tool calls, tokens, price")
async def llm_calls(
    uow: UowDep,
    task: Annotated[str | None, Query(description="intent, answer, curator, explain")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[LlmCallOut]:
    calls = await LlmJournalView(uow).recent(task=task, limit=limit)
    return [LlmCallOut.model_validate(c, from_attributes=True) for c in calls]


def _spend(spend: object) -> LlmSpendOut:
    return LlmSpendOut.model_validate(spend, from_attributes=True)


@router.get(path="/llm/usage", summary="LLM spend today and in total, by task and model")
async def llm_usage(uow: UowDep, clock: ClockDep) -> LlmUsageOut:
    view = LlmJournalView(uow)
    now = clock.now()
    today = [_spend(s) for s in await view.spend(day_start(now))]
    total = [_spend(s) for s in await view.spend(datetime.min.replace(tzinfo=now.tzinfo))]
    return LlmUsageOut(
        today=today,
        total=total,
        today_cost_usd=round(sum(s.cost_usd for s in today), 4),
        total_cost_usd=round(sum(s.cost_usd for s in total), 4),
    )


@router.post(
    path="/demo/reset",
    dependencies=write,
    summary="Back to the seeded demo: knowledge from the seed, no bookings, questions or changes",
)
async def demo_reset(uow: UowDep, settings: SettingsDep) -> DemoResetOut:
    return DemoResetOut(summary=await DemoReset(uow, settings.data_dir).reset())
