from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    database_url: str = "postgresql+asyncpg://ragapp:ragapp@localhost:5432/ragapp"
    redis_url: str = "redis://localhost:6379/0"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model_reasoner: str = "qwen2.5:3b"
    ollama_model_planner: str = "qwen2.5:3b"
    ollama_model_embed: str = "nomic-embed-text"
    ollama_num_ctx: int = 4096
    ollama_num_predict: int = 512

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"

    log_level: str = "INFO"
    cors_allow_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    cors_allow_origin_regex: str | None = (
        r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?"
    )

    langfuse_host: str | None = None
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
