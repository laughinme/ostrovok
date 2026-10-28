from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field

from app.api.deps import RegistryDep, VisionLlmDep, rate_limit
from app.api.schemas.base import ApiModel
from app.service.ports import LlmUnavailableError
from app.service.search.photo_intent import PHOTO_UNAVAILABLE, decode_photo, describe_photo

router = APIRouter(tags=["Search"])


class PhotoIntentRequest(ApiModel):
    image: str = Field(min_length=1, repr=False, description="Base64 image, at most 5 MiB decoded")
    media_type: Literal["image/jpeg", "image/png", "image/webp"]


class PhotoIntentResponse(ApiModel):
    text: str


@router.post(
    "/intents/photo",
    summary="Фото → редактируемое желание гостя; фото не сохраняется",
    dependencies=[Depends(rate_limit("photo_intent"))],
    responses={400: {"description": "Invalid photo"}, 503: {"description": "LLM unavailable"}},
)
async def photo_intent(
    payload: PhotoIntentRequest, llm: VisionLlmDep, registry: RegistryDep
) -> PhotoIntentResponse:
    try:
        image = decode_photo(payload.image, payload.media_type)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from None
    if llm is None or not llm.available:
        raise HTTPException(503, PHOTO_UNAVAILABLE)
    vocabulary = [c.title for c in await registry.all()]
    try:
        text = await describe_photo(llm, image, payload.media_type, vocabulary)
    except LlmUnavailableError:
        raise HTTPException(503, PHOTO_UNAVAILABLE) from None
    return PhotoIntentResponse(text=text)
