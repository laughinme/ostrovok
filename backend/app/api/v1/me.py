from fastapi import APIRouter

from app.api.deps import AccountServiceDep, CurrentUserDep
from app.api.schemas.users import AccountOut

router = APIRouter(prefix="/me", tags=["Me"])


@router.get(path="", summary="Who is signed in")
async def get_me(user: CurrentUserDep, svc: AccountServiceDep) -> AccountOut:
    return AccountOut.from_domain(await svc.get(user.id))
