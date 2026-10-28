import base64

import pytest
from pydantic_ai import (
    BinaryContent,
    ModelMessage,
    ModelRequest,
    ModelResponse,
    ToolCallPart,
    UserPromptPart,
)
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.infra.llm.guards import DailyLimit
from app.infra.llm.pydantic_ai_model import PydanticAiLanguageModel
from app.service.ports import LlmUnavailableError
from app.service.search.photo_intent import MAX_PHOTO_BYTES, decode_photo, describe_photo

PNG = b"\x89PNG\r\n\x1a\nphoto-input"


@pytest.mark.parametrize(
    ("image", "mime"),
    [(PNG, "image/png"), (b"\xff\xd8\xffimage", "image/jpeg"), (b"RIFFxxxxWEBPdata", "image/webp")],
)
def test_photo_formats(image: bytes, mime: str) -> None:
    assert decode_photo(base64.b64encode(image).decode(), mime) == image


@pytest.mark.parametrize("encoded", ["!bad", "", base64.b64encode(b"<svg/>").decode()])
def test_photo_rejects_invalid_bytes(encoded: str) -> None:
    with pytest.raises(ValueError, match=r"фото|Фото"):
        decode_photo(encoded, "image/png")


def test_photo_rejects_oversize_and_wrong_mime() -> None:
    with pytest.raises(ValueError, match=r"фото|Фото"):
        decode_photo("a" * (4 * ((MAX_PHOTO_BYTES + 2) // 3) + 1), "image/png")
    with pytest.raises(ValueError, match=r"фото|Фото"):
        decode_photo(base64.b64encode(PNG).decode(), "image/jpeg")


async def test_photo_without_key_is_unavailable() -> None:
    with pytest.raises(LlmUnavailableError):
        await describe_photo(None, PNG, "image/png", [])


async def test_image_uses_shared_adapter_and_call_limit() -> None:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        parts = [p for m in messages if isinstance(m, ModelRequest) for p in m.parts]
        content = next(p.content for p in parts if isinstance(p, UserPromptPart))
        assert not isinstance(content, str)
        image = next(c for c in content if isinstance(c, BinaryContent))
        assert image.data == PNG
        assert image.media_type == "image/png"
        assert "Море из окна" in str(messages)
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, {"text": "Хочу вид на море"})]
        )

    llm = PydanticAiLanguageModel(
        FunctionModel(model), model_name="fake", timeout_sec=2, limit=DailyLimit(None, 1)
    )
    assert await describe_photo(llm, PNG, "image/png", ["Море из окна"]) == "Хочу вид на море"
    with pytest.raises(LlmUnavailableError, match="daily"):
        await describe_photo(llm, PNG, "image/png", [])


async def test_photo_provider_failure_does_not_expose_image(
    caplog: pytest.LogCaptureFixture,
) -> None:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        raise RuntimeError("data:image/png;base64,private-photo")

    llm = PydanticAiLanguageModel(
        FunctionModel(model), model_name="fake", timeout_sec=2, limit=DailyLimit(None, 1)
    )
    with pytest.raises(LlmUnavailableError, match=r"^RuntimeError$"):
        await describe_photo(llm, PNG, "image/png", [])
    assert "private-photo" not in caplog.text
