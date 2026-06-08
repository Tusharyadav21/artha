from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.domain.models import HomeTab, ThemePreference, ChatScopeMode


class UserCreate(BaseModel):
    """
    Purpose:
        Schema for user registration requests.

    Responsibilities:
        - Validate email format and length
        - Validate password strength (min 8 chars)
        - Normalize email to lowercase

    Args:
        email (str): User email address.
        password (str): Raw password.
    """
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
    """
    Purpose:
        Sanitized user profile representation for API responses.

    Responsibilities:
        - Expose non-sensitive user data
        - Map database attributes to schema fields

    Attributes:
        id (UUID): Unique user identifier.
        email (str): Normalized email address.
        display_name (str | None): User's preferred name.
        theme_preference (ThemePreference): UI theme.
        default_home_tab (HomeTab): Starting tab for the app.
        sidebar_collapsed (bool): User's sidebar state.
        new_chat_scope_mode (ChatScopeMode): Default chat behavior.
        created_at (datetime): Account creation timestamp.
    """
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
    """
    Purpose:
        Schema for partial updates to user profile settings.

    Responsibilities:
        - Allow optional updates to display name and preferences
        - Prevent explicit null values for preferences

    Attributes:
        display_name (str | None): Optional new display name.
        theme_preference (ThemePreference | None): Optional theme update.
        default_home_tab (HomeTab | None): Optional home tab update.
        sidebar_collapsed (bool | None): Optional sidebar state update.
        new_chat_scope_mode (ChatScopeMode | None): Optional scope mode update.
    """
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
    """
    Purpose:
        Schema for authentication success responses.

    Attributes:
        access_token (str): The JWT access token.
        token_type (str): Type of token, defaults to 'bearer'.
        user (UserRead): Sanitized user profile.
    """
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ChangePasswordRequest(BaseModel):
    """
    Purpose:
        Request schema for changing an authenticated user's password.

    Attributes:
        current_password (str): The existing password for verification.
        new_password (str): The new password to set.
    """
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    """
    Purpose:
        Request schema for initiating a password reset.

    Attributes:
        email (str): The email of the account to reset.
    """
    email: str = Field(pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class ResetPasswordRequest(BaseModel):
    """
    Purpose:
        Request schema for completing a password reset using a token.

    Attributes:
        token (str): The unique reset token.
        new_password (str): The new password to be set.
    """
    token: str
    new_password: str = Field(min_length=8, max_length=128)
