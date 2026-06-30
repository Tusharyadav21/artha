"""
LLM factory: Fernet key encryption helpers + per-user client resolution.

The encryption key is derived from JWT_SECRET via SHA-256 so no extra env var
is needed. If a user has no config the factory falls back to local Ollama.
Uses LiteLLMClient for all providers via a model string mapping.
"""

import base64
import logging
from uuid import UUID

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.enums import LLMProvider
from app.services.llm_client import BaseLLMClient, LiteLLMClient
from app.services.repositories.llm_config import LLMConfigRepository

logger = logging.getLogger(__name__)

# LiteLLM model-string prefix per provider
_LITELLM_PREFIX: dict[LLMProvider, str] = {
    LLMProvider.OPENAI: "openai",
    LLMProvider.ANTHROPIC: "anthropic",
    LLMProvider.GROQ: "groq",
    LLMProvider.GEMINI: "gemini",
    LLMProvider.MISTRAL: "mistral",
    LLMProvider.TOGETHER: "together_ai",
    LLMProvider.COHERE: "cohere",
    LLMProvider.OLLAMA: "ollama",
}


def _fernet() -> Fernet:
    """
    Return a Fernet instance for API-key encryption.

    Priority:
      1. BYOK_MASTER_KEY env var — dedicated Fernet key (recommended for production).
         Generate once with: python -c "from cryptography.fernet import Fernet; \
print(Fernet.generate_key().decode())"
         Rotating this key does NOT affect JWT auth.
      2. ENCRYPTION_KEY env var — legacy fallback (still honoured).
      3. Derive 32-byte key from jwt_secret via HKDF-SHA256 — last-resort fallback
         for existing deployments. Rotating jwt_secret will invalidate stored keys.
    """
    settings = get_settings()
    if settings.byok_master_key:
        return Fernet(settings.byok_master_key.encode())
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
    Resolve the LLM client for a user via LiteLLM.

    Lookup order:
      1. UserLLMConfig row → decrypt key → build LiteLLMClient with provider prefix
      2. No config or decryption failure → LiteLLMClient pointed at local Ollama
    """
    config = await LLMConfigRepository(session).get_by_user(user_id)
    if config is None:
        settings = get_settings()
        return LiteLLMClient(
            model=f"ollama/{settings.ollama_model_planner}",
            base_url=settings.ollama_base_url,
        )

    provider = LLMProvider(config.provider)
    prefix = _LITELLM_PREFIX.get(provider, "ollama")

    if provider == LLMProvider.OLLAMA:
        settings = get_settings()
        return LiteLLMClient(
            model=f"ollama/{config.model or settings.ollama_model_planner}",
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            base_url=settings.ollama_base_url,
            max_retries=config.max_retries,
            timeout_s=config.timeout_s,
        )

    try:
        api_key = decrypt_api_key(config.api_key_encrypted)
    except (InvalidToken, Exception):
        logger.warning("API key decryption failed for user %s — falling back to Ollama", user_id)
        settings = get_settings()
        return LiteLLMClient(
            model=f"ollama/{settings.ollama_model_planner}",
            base_url=settings.ollama_base_url,
        )

    extra_params = config.extra_params or {}
    base_url = extra_params.get("base_url")

    return LiteLLMClient(
        model=f"{prefix}/{config.model}",
        api_key=api_key,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        base_url=base_url,
        max_retries=config.max_retries,
        timeout_s=config.timeout_s,
    )
