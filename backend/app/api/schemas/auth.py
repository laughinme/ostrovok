from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.api.schemas.base import RequestModel, ResponseModel
from app.domain.users import Role


class RegisterRequest(RequestModel):
    """Data required for registration."""

    email: EmailStr = Field(..., description="User e-mail", examples=["user@example.com"])
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    username: str | None = Field(None, min_length=1, max_length=64, description="Display name")


class LoginRequest(RequestModel):
    """Credentials used for login."""

    email: EmailStr = Field(..., description="User e-mail")
    password: str = Field(..., max_length=128, description="User password")


class TokenPair(BaseModel):
    """
    `refresh_token` is null for web clients: they get it as an httpOnly cookie
    together with a readable `csrf_token` cookie to echo in `X-CSRF-Token`.
    """

    access_token: str
    refresh_token: str | None = None
    token_type: Literal["bearer"] = "bearer"  # noqa: S105 - OAuth2 token type, not a secret
    expires_in: int = Field(..., description="Access token lifetime in seconds")


class DemoLoginRequest(RequestModel):
    persona: str = Field(..., min_length=1, max_length=64, examples=["guest_anna"])


class PersonaOut(ResponseModel):
    key: str
    role: Role
    name: str
    title: str
    hotels: list[str] = Field(default_factory=list, description="OSM ids of managed hotels")
