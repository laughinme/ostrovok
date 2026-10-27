from fastapi import APIRouter

from app.api.deps import RegistryDep
from app.api.schemas.knowledge import CharacteristicOut

router = APIRouter(tags=["Knowledge"])


@router.get(path="/characteristics", summary="What the system can check and how")
async def list_characteristics(registry: RegistryDep) -> list[CharacteristicOut]:
    return [CharacteristicOut.from_domain(c) for c in await registry.all()]
