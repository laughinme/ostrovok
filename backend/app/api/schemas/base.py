from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class RequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ResponseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CursorPage[T](BaseModel):
    items: list[T]
    next_cursor: str | None = None


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, serialize_by_alias=True
    )
