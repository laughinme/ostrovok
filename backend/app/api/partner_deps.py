from typing import Annotated

from fastapi import Depends

from app.api.deps import UowDep, require
from app.domain.users import CurrentUser, Permission
from app.service.partner.access import PartnerAccess

PartnerUserDep = Annotated[CurrentUser, Depends(require(Permission.PARTNER_CABINET))]


def _access(uow: UowDep) -> PartnerAccess:
    return PartnerAccess(uow)


PartnerAccessDep = Annotated[PartnerAccess, Depends(_access)]
