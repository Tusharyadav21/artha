from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.domain.models import HomeTab, ThemePreference, ChatScopeMode


class UserCreate(BaseModel):
    email: str = Field(
        min_length=3,
        max_length=320,
        pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    )
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value:
            raise ValueError("Email must contain @")
        return value



class UserRead(BaseModel):
    id: UUID
    email: str
    display_name: str | None
    theme_preference: ThemePreference
    default_home_tab: HomeTab
    sidebar_collapsed: bool
    new_chat_scope_mode: ChatScopeMode
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    theme_preference: ThemePreference | None = None
    default_home_tab: HomeTab | None = None
    sidebar_collapsed: bool | None = None
    new_chat_scope_mode: ChatScopeMode | None = None

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator(
        "theme_preference",
        "default_home_tab",
        "sidebar_collapsed",
        "new_chat_scope_mode",
        mode="before",
    )
    @classmethod
    def reject_null_preferences(cls, value, info):
        if value is None:
            field_name = info.field_name
            msg = f"Cannot set {field_name} to null; omit to keep current value"
            raise ValueError(msg)
        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
