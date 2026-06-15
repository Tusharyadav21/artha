from functools import lru_cache
from logging import getLogger

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
        env_file_encoding="utf-8",
    )

    database_url: str = Field(..., min_length=1, pattern=r"^postgresql\+asyncpg://.+$")
    redis_url: str = Field(..., min_length=1, pattern=r"^redis://[^\s]+$")

    ollama_base_url: str = Field(default="http://host.docker.internal:11434")
    ollama_model_reasoner: str = Field(default="gemma4:e4b")
    ollama_model_planner: str = Field(default="gemma4:e4b")
    ollama_model_embed: str = Field(default="bge-m3")
    ollama_num_ctx: int = Field(default=8192, ge=4096, le=131072)
    ollama_num_predict: int = Field(default=4096, ge=1, le=131072)

    reranker_model: str = Field(default="BAAI/bge-reranker-v2-m3")
    reranker_device: str = Field(default="cpu", pattern=r"^(cpu|cuda|mps)$")
    embed_cache_ttl_seconds: int = Field(default=259200, ge=0)
    hyde_enabled: bool = Field(default=True)

    ingestion_semaphore_limit: int = Field(default=3, ge=1, le=20)
    ingestion_enrichment_timeout: float = Field(default=30.0, ge=5.0, le=120.0)
    ingestion_max_chunk_tokens: int = Field(default=512, ge=64, le=4096)
    chunk_child_words: int = Field(default=80, ge=20, le=500)
    chunk_parent_words: int = Field(default=320, ge=80, le=2000)
    hyde_complexity_threshold: int = Field(default=6, ge=1)
    history_summarize_at: int = Field(default=10, ge=1)
    history_keep_recent: int = Field(default=6, ge=1)
    relevance_threshold: float = Field(default=0.05, ge=0.0, le=1.0)
    hybrid_search_alpha: float = Field(default=0.5, ge=0.0, le=1.0)
    hyde_variants: int = Field(default=3, ge=1, le=10)

    jwt_secret: str = Field(..., min_length=32)
    jwt_algorithm: str = Field(default="HS256")

    log_level: str = Field(default="INFO", pattern=r"^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    cors_allow_origins: list[str] = Field(default=["http://localhost:3000", "http://127.0.0.1:3000"])
    cors_allow_origin_regex: str | None = Field(
        default=r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?"
    )

    encryption_key: str | None = Field(
        default=None,
        description=(
            "Fernet key for encrypting API keys at rest. "
            "Generate with: python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\". "
            "If unset, derived from jwt_secret via HKDF-SHA256."
        ),
    )

    vision_model: str = Field(default="gemma4:e4b")
    image_captioning_enabled: bool = Field(default=True)

    media_root: str = Field(default="/tmp/artha/media")

    langfuse_host: str | None = Field(default="http://localhost:3001")
    langfuse_public_key: str | None = Field(default=None)
    langfuse_secret_key: str | None = Field(default=None)


@lru_cache
def get_settings() -> Settings:
    return Settings()
