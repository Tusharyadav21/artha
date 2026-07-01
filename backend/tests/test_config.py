"""Tests for Settings / config validation."""
import os
from functools import lru_cache

import pytest
from pydantic import ValidationError

from app.config import Settings, get_settings


class TestSettingsValidation:
    def test_defaults(self) -> None:
        """With only required env vars set, defaults should apply."""
        s = Settings(
            database_url="postgresql+asyncpg://u:p@h/db",
            redis_url="redis://localhost:6379/0",
            jwt_secret="x" * 32,
        )
        assert s.jwt_algorithm == "HS256"
        assert s.jwt_access_token_expire_minutes == 30
        # Default is read from .env if present, otherwise the code default
        assert s.ollama_base_url is not None
        assert s.chunk_child_words == 80
        assert s.chunk_parent_words == 320

    def test_rejects_invalid_db_url(self) -> None:
        """database_url must match postgresql+asyncpg:// pattern."""
        with pytest.raises(ValidationError):
            Settings(
                database_url="sqlite:///test.db",
                redis_url="redis://localhost:6379/0",
                jwt_secret="x" * 32,
            )

    def test_rejects_invalid_redis_url(self) -> None:
        with pytest.raises(ValidationError):
            Settings(
                database_url="postgresql+asyncpg://u:p@h/db",
                redis_url="not-a-redis-url",
                jwt_secret="x" * 32,
            )

    def test_rejects_short_jwt_secret(self) -> None:
        with pytest.raises(ValidationError):
            Settings(
                database_url="postgresql+asyncpg://u:p@h/db",
                redis_url="redis://localhost:6379/0",
                jwt_secret="short",
            )

    def test_ollama_settings(self) -> None:
        s = Settings(
            database_url="postgresql+asyncpg://u:p@h/db",
            redis_url="redis://localhost:6379/0",
            jwt_secret="x" * 32,
            ollama_num_ctx=16384,
            ollama_num_predict=8192,
        )
        assert s.ollama_num_ctx == 16384
        assert s.ollama_num_predict == 8192

    def test_rejects_low_num_ctx(self) -> None:
        with pytest.raises(ValidationError):
            Settings(
                database_url="postgresql+asyncpg://u:p@h/db",
                redis_url="redis://localhost:6379/0",
                jwt_secret="x" * 32,
                ollama_num_ctx=1000,
            )

    def test_rejects_invalid_reranker_device(self) -> None:
        with pytest.raises(ValidationError):
            Settings(
                database_url="postgresql+asyncpg://u:p@h/db",
                redis_url="redis://localhost:6379/0",
                jwt_secret="x" * 32,
                reranker_device="tpu",
            )

    def test_log_level_validation(self) -> None:
        with pytest.raises(ValidationError):
            Settings(
                database_url="postgresql+asyncpg://u:p@h/db",
                redis_url="redis://localhost:6379/0",
                jwt_secret="x" * 32,
                log_level="TRACE",
            )

    def test_jwt_token_bounds(self) -> None:
        """Access token expiry must be 5-120 min, refresh 60-43200 min."""
        with pytest.raises(ValidationError):
            Settings(
                database_url="postgresql+asyncpg://u:p@h/db",
                redis_url="redis://localhost:6379/0",
                jwt_secret="x" * 32,
                jwt_access_token_expire_minutes=200,
            )

    def test_hyde_enabled_by_default(self) -> None:
        s = Settings(
            database_url="postgresql+asyncpg://u:p@h/db",
            redis_url="redis://localhost:6379/0",
            jwt_secret="x" * 32,
        )
        assert s.hyde_enabled is True

    def test_cors_defaults(self) -> None:
        s = Settings(
            database_url="postgresql+asyncpg://u:p@h/db",
            redis_url="redis://localhost:6379/0",
            jwt_secret="x" * 32,
        )
        assert "http://localhost:3000" in s.cors_allow_origins
        assert s.cors_allow_origin_regex is not None


class TestGetSettings:
    def test_caching(self) -> None:
        """get_settings is cached via lru_cache."""
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2
        # Clear to avoid polluting other tests
        get_settings.cache_clear()

    def test_uses_env_vars(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("OLLAMA_BASE_URL", "http://custom:11434")
        monkeypatch.setenv("HYDE_ENABLED", "false")
        monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@h/db")
        monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
        monkeypatch.setenv("JWT_SECRET", "x" * 32)
        get_settings.cache_clear()
        s = get_settings()
        assert s.ollama_base_url == "http://custom:11434"
        assert s.hyde_enabled is False
        get_settings.cache_clear()

    def test_byok_master_key_default(self) -> None:
        s = Settings(
            database_url="postgresql+asyncpg://u:p@h/db",
            redis_url="redis://localhost:6379/0",
            jwt_secret="x" * 32,
        )
        assert s.byok_master_key is None
