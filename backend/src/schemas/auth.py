from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

ThemePreference = Literal["system", "light", "dark"]
DefaultHomeTab = Literal["chat", "library", "settings"]
NewChatScopeMode = Literal["clear", "remember", "all-completed"]


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
    default_home_tab: DefaultHomeTab
    sidebar_collapsed: bool
    new_chat_scope_mode: NewChatScopeMode
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    theme_preference: ThemePreference | None = None
    default_home_tab: DefaultHomeTab | None = None
    sidebar_collapsed: bool | None = None
    new_chat_scope_mode: NewChatScopeMode | None = None

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
