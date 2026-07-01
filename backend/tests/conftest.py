import os
from uuid import UUID, uuid4

import pytest

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://test:test@localhost/test",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET", "test-secret-key-with-at-least-32-chars")

from app.config import get_settings


@pytest.fixture
def fake_uuid() -> UUID:
    return uuid4()


@pytest.fixture(autouse=True)
def configure_test_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+asyncpg://test:test@localhost/test",
    )
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("JWT_SECRET", "test-secret-key-with-at-least-32-chars")
    get_settings.cache_clear()
