import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class LLMProviderSchema(StrEnum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GROQ = "groq"
    GEMINI = "gemini"
    MISTRAL = "mistral"
    TOGETHER = "together"
    COHERE = "cohere"
    OLLAMA = "ollama"


class LLMConfigCreate(BaseModel):
    provider: LLMProviderSchema
    api_key: str = Field(min_length=1, description="Plaintext key; encrypted before storage")
    model: str | None = Field(default=None, description="Override the provider default model")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=32768)
    max_retries: int = Field(default=3, ge=1, le=10)
    base_delay_s: float = Field(default=1.0, ge=0.1, le=10.0)
    timeout_s: int = Field(default=60, ge=5, le=300)
    extra_params: dict[str, Any] = Field(
        default_factory=dict,
        description="Provider-specific overrides e.g. {'base_url': '...'}",
    )


class LLMConfigRead(BaseModel):
    id: uuid.UUID
    provider: LLMProviderSchema
    api_key_masked: str
    model: str | None
    temperature: float
    max_tokens: int
    max_retries: int
    base_delay_s: float
    timeout_s: int
    extra_params: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LLMConfigTestResult(BaseModel):
    success: bool
    latency_ms: float
    error: str | None = None
