from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from uuid import uuid4

from fastapi.testclient import TestClient

from src.auth.dependencies import get_current_user
from src.core.database import get_db
from src.domain.models import User
from src.main import app


class FakeDb:
    pass


async def fake_db() -> AsyncGenerator[FakeDb, None]:
    yield FakeDb()


def build_user() -> User:
    user = User(
        id=uuid4(),
        email="demo@example.com",
        hashed_password="hashed",
        display_name="Demo User",
        theme_preference="system",
        default_home_tab="chat",
        sidebar_collapsed=False,
        new_chat_scope_mode="clear",
        created_at=datetime.now(UTC),
    )
    return user


def test_get_me_returns_settings() -> None:
    user = build_user()

    async def override_current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_db] = fake_db
    client = TestClient(app)

    response = client.get("/api/auth/me", headers={"Authorization": "Bearer test"})

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["display_name"] == "Demo User"
    assert response.json()["theme_preference"] == "system"
    assert response.json()["default_home_tab"] == "chat"
    assert response.json()["sidebar_collapsed"] is False
    assert response.json()["new_chat_scope_mode"] == "clear"


def test_patch_me_updates_partial_settings(monkeypatch) -> None:
    user = build_user()

    async def override_current_user() -> User:
        return user

    async def fake_update(self, current_user: User, **kwargs) -> User:
        for key, value in kwargs.items():
            setattr(current_user, key, value)
        return current_user

    monkeypatch.setattr("src.repositories.users.UserRepository.update", fake_update)

    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_db] = fake_db
    client = TestClient(app)

    response = client.patch(
        "/api/auth/me",
        headers={"Authorization": "Bearer test"},
        json={
            "display_name": "Workspace Owner",
            "theme_preference": "dark",
            "default_home_tab": "library",
            "sidebar_collapsed": True,
            "new_chat_scope_mode": "remember",
        },
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["display_name"] == "Workspace Owner"
    assert payload["theme_preference"] == "dark"
    assert payload["default_home_tab"] == "library"
    assert payload["sidebar_collapsed"] is True
    assert payload["new_chat_scope_mode"] == "remember"


def test_patch_me_rejects_null_preferences() -> None:
    user = build_user()

    async def override_current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_db] = fake_db
    client = TestClient(app)

    response = client.patch(
        "/api/auth/me",
        headers={"Authorization": "Bearer test"},
        json={"theme_preference": None},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 422
