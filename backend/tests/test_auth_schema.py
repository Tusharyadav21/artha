import pytest
from pydantic import ValidationError

from app.models.schemas.auth import UserUpdate


def test_user_update_normalizes_blank_display_name() -> None:
    payload = UserUpdate(display_name="   ")

    assert payload.display_name is None


@pytest.mark.parametrize(
    "field_name",
    [
        "theme_preference",
        "default_home_tab",
        "sidebar_collapsed",
        "new_chat_scope_mode",
    ],
)
def test_user_update_rejects_null_preference_values(field_name: str) -> None:
    with pytest.raises(ValidationError):
        UserUpdate.model_validate({field_name: None})
