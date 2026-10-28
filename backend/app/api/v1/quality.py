from fastapi import APIRouter, Depends

from app.api.deps import UowDep, require
from app.api.schemas.quality import QualityReport
from app.domain.users import Permission
from app.service.quality.reports import QualityReports

router = APIRouter(
    prefix="/console",
    tags=["Console"],
    dependencies=[Depends(require(Permission.CONSOLE_READ))],
)


@router.get(path="/quality", summary="Latest saved quality report; make eval generates one")
async def quality(uow: UowDep) -> QualityReport:
    return QualityReport.model_validate(await QualityReports(uow).latest())
