from typing import Literal

from sqlalchemy.dialects.postgresql import insert

from app.db.models import AppSetting
from app.db.uow import UnitOfWork

LlmMode = Literal["auto", "off"]
LLM_MODE = "llm_mode"


class AppSettings:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def llm_mode(self, default: LlmMode = "auto") -> LlmMode:
        row = await self._uow.session.get(AppSetting, LLM_MODE)
        return "off" if row is not None and row.value == "off" else default

    async def set_llm_mode(self, mode: LlmMode) -> None:
        await self._uow.session.execute(
            insert(AppSetting)
            .values(key=LLM_MODE, value=mode)
            .on_conflict_do_update(index_elements=["key"], set_={"value": mode})
        )
