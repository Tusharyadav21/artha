import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas.llm_config import LLMConfigCreate, LLMConfigRead, LLMConfigTestResult
from app.models.user import User
from app.services.llm_factory import decrypt_api_key, encrypt_api_key, get_llm_for_user
from app.services.repositories.llm_config import LLMConfigRepository
from app.utils.database import get_db
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/llm-config", tags=["llm-config"])


def _mask(key: str) -> str:
    return key[:4] + "..." + key[-4:] if len(key) > 8 else "****"


def _to_read(config, masked_key: str) -> LLMConfigRead:
    return LLMConfigRead(
        id=config.id,
        provider=config.provider,
        api_key_masked=masked_key,
        model=config.model,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        max_retries=config.max_retries,
        base_delay_s=config.base_delay_s,
        timeout_s=config.timeout_s,
        extra_params=config.extra_params or {},
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.post("", response_model=LLMConfigRead)
async def upsert_llm_config(
    payload: LLMConfigCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LLMConfigRead:
    """Save or update the user's LLM provider configuration."""
    encrypted = encrypt_api_key(payload.api_key)
    config = await LLMConfigRepository(db).upsert(
        current_user.id,
        provider=payload.provider.value,
        api_key_encrypted=encrypted,
        model=payload.model,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
        max_retries=payload.max_retries,
        base_delay_s=payload.base_delay_s,
        timeout_s=payload.timeout_s,
        extra_params=payload.extra_params,
    )
    return _to_read(config, _mask(payload.api_key))


@router.get("", response_model=LLMConfigRead)
async def get_llm_config(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LLMConfigRead:
    """Return the active LLM config (key masked)."""
    config = await LLMConfigRepository(db).get_by_user(current_user.id)
    if config is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No LLM config found")
    raw_key = decrypt_api_key(config.api_key_encrypted)
    return _to_read(config, _mask(raw_key))


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_llm_config(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Remove the user's LLM config; subsequent requests fall back to Ollama."""
    deleted = await LLMConfigRepository(db).delete(current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No LLM config found")


@router.post("/test", response_model=LLMConfigTestResult)
async def test_llm_config(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LLMConfigTestResult:
    """Ping the configured provider with a minimal prompt to validate the key."""
    t0 = time.perf_counter()
    llm = await get_llm_for_user(current_user.id, db)
    try:
        await llm.generate("Reply with a single word: ok")
        return LLMConfigTestResult(
            success=True,
            latency_ms=round((time.perf_counter() - t0) * 1000, 1),
        )
    except Exception as exc:
        return LLMConfigTestResult(
            success=False,
            latency_ms=round((time.perf_counter() - t0) * 1000, 1),
            error=str(exc),
        )
    finally:
        await llm.close()
