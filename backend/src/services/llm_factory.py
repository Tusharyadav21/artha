"""
LLM factory: Fernet key encryption helpers + per-user client resolution.

The encryption key is derived from JWT_SECRET via SHA-256 so no extra env var
is needed. If a user has no config the factory falls back to local Ollama.
"""

import base64
import logging
from uuid import UUID

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.domain.models import LLMProvider
from src.repositories.llm_config import LLMConfigRepository
from src.services.llm_client import (
    AnthropicClient,
    BaseLLMClient,
    CohereClient,
    GeminiClient,
    OllamaAdapter,
    OpenAICompatibleClient,
)

logger = logging.getLogger(__name__)

_OPENAI_COMPATIBLE = {
    LLMProvider.OPENAI,
    LLMProvider.GROQ,
    LLMProvider.MISTRAL,
    LLMProvider.TOGETHER,
}


def _fernet() -> Fernet:
    """
    Return a Fernet instance for API-key encryption.

    Priority:
      1. ENCRYPTION_KEY env var — a pre-generated Fernet key (recommended for production).
         Generate once with: python -c "from cryptography.fernet import Fernet; \
print(Fernet.generate_key().decode())"
      2. Fallback: derive 32-byte key from jwt_secret via HKDF-SHA256 with an
         app-specific salt and info label. Better than raw SHA-256, but rotating
         the jwt_secret will invalidate all stored keys — set ENCRYPTION_KEY in prod.
    """
    settings = get_settings()
    if settings.encryption_key:
        return Fernet(settings.encryption_key.encode())

    kdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"artha-llm-config-v1",
        info=b"api-key-encryption",
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.jwt_secret.encode()))
    return Fernet(key)


def encrypt_api_key(plaintext: str) -> bytes:
    return _fernet().encrypt(plaintext.encode())


def decrypt_api_key(ciphertext: bytes) -> str:
    return _fernet().decrypt(ciphertext).decode()


async def get_llm_for_user(user_id: UUID, session: AsyncSession) -> BaseLLMClient:
    """
    Resolve the LLM client for a user.

    Lookup order:
      1. UserLLMConfig row → decrypt key → build provider client
      2. No config or decryption failure → OllamaAdapter (local fallback)
    """
    config = await LLMConfigRepository(session).get_by_user(user_id)
    if config is None:
        return OllamaAdapter()

    try:
        api_key = decrypt_api_key(config.api_key_encrypted)
    except (InvalidToken, Exception):
        logger.warning("API key decryption failed for user %s — falling back to Ollama", user_id)
        return OllamaAdapter()

    kwargs: dict = dict(
        model=config.model,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        max_retries=config.max_retries,
        base_delay_s=config.base_delay_s,
        timeout_s=config.timeout_s,
        extra_params=config.extra_params or {},
    )

    provider = LLMProvider(config.provider)

    if provider in _OPENAI_COMPATIBLE:
        return OpenAICompatibleClient(provider.value, api_key, **kwargs)
    if provider == LLMProvider.ANTHROPIC:
        return AnthropicClient(api_key, **kwargs)
    if provider == LLMProvider.GEMINI:
        return GeminiClient(api_key, **kwargs)
    if provider == LLMProvider.COHERE:
        return CohereClient(api_key, **kwargs)

    # LLMProvider.OLLAMA or unrecognised
    return OllamaAdapter(model=config.model)
