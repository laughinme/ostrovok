from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.deps import CodecDep, UowDep
from app.domain.users import CurrentUser
from app.service.auth import resolve_current_user

_optional_bearer = HTTPBearer(auto_error=False)


async def optional_guest(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_optional_bearer)],
    uow: UowDep,
    codec: CodecDep,
) -> CurrentUser | None:
    if credentials is None:
        return None
    return await resolve_current_user(uow, codec.decode_access(credentials.credentials))


OptionalGuestDep = Annotated[CurrentUser | None, Depends(optional_guest)]
