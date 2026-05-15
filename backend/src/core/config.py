from functools import lru_cache
from logging import getLogger

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
        env_file_encoding="utf-8",
    )

    database_url: str = Field(
        ...,
        description="PostgreSQL connection URL with asyncpg driver",
        pattern=r"^postgresql\+asyncpg://.+$",
    )
    redis_url: str = Field(
        ...,
        description="Redis connection URL",
        pattern=r"^redis://[^\s]+$",
    )

    ollama_base_url: str = Field(
        default="http://localhost:11434",
        description="Ollama server base URL",
    )
    ollama_model_reasoner: str = Field(
        default="qwen2.5:7b",
        description="Model name for reasoning",
    )
    ollama_model_planner: str = Field(
        default="qwen2.5:7b",
        description="Model name for planning",
    )
    ollama_model_embed: str = Field(
        default="nomic-embed-text",
        description="Model name for embeddings",
    )
    ollama_num_ctx: int = Field(
        default=4096,
        description="Context window size",
        ge=1024,
        le=131072,
    )
    ollama_num_predict: int = Field(
        default=2048,
        description="Maximum tokens to predict",
        ge=1,
        le=4096,
    )

    jwt_secret: str = Field(
        ...,
        description="Secret key for JWT token signing",
        min_length=32,
    )
    jwt_algorithm: str = Field(
        default="HS256",
        description="JWT signing algorithm",
    )

    log_level: str = Field(
        default="INFO",
        description="Logging level",
        pattern=r"^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$",
    )
    cors_allow_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins",
    )
    cors_allow_origin_regex: str | None = Field(
        default=r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?",
        description="Allowed CORS origin regex",
    )

    langfuse_host: str | None = Field(
        default="http://localhost:3001",
        description="Langfuse host URL",
    )
    langfuse_public_key: str | None = Field(
        default=None,
        description="Langfuse public key",
    )
    langfuse_secret_key: str | None = Field(
        default=None,
        description="Langfuse secret key",
    )

    @field_validator("database_url", "redis_url", "jwt_secret", mode="before")
    @classmethod
    def validate_env_vars(cls, v: str, info) -> str:
        """Validate that required environment variables are set."""
        if v is None or v == "":
            raise ValueError(
                f"Required environment variable {info.field_name} is not set"
            )
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
