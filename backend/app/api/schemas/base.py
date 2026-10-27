from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class RequestModel(BaseModel):
    """Request bodies: unknown fields are an error, so client typos don't pass silently."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ResponseModel(BaseModel):
    """Response bodies are built from domain dataclasses, never from ORM objects."""

    model_config = ConfigDict(from_attributes=True)


class CursorPage[T](BaseModel):
    items: list[T]
    next_cursor: str | None = None


class ApiModel(BaseModel):
    """Contract models (08 §9): camelCase on the wire, snake_case in Python."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, serialize_by_alias=True
    )
