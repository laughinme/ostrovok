from datetime import datetime
from typing import Any

from sqlalchemy import select

from app.core.errors import NotFoundError
from app.db.models import QualityReportRow
from app.db.uow import UnitOfWork


class QualityReports:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def latest(self) -> dict[str, Any]:
        row = await self._uow.session.scalar(
            select(QualityReportRow)
            .order_by(QualityReportRow.generated_at.desc(), QualityReportRow.id.desc())
            .limit(1)
        )
        if row is None:
            raise NotFoundError("Отчёта качества ещё нет. Запустите make eval")
        return row.report

    async def save(self, report: dict[str, Any], generated_at: datetime) -> None:
        self._uow.session.add(QualityReportRow(report=report, generated_at=generated_at))
        await self._uow.flush()
