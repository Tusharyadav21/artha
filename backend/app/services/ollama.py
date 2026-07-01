"""Minimal shim — OllamaClient replaced by LiteLLMClient.

All LLM calls now go through LiteLLMClient in llm_client.py.
This module keeps only validate_models() as a standalone function.
"""

import logging

from app.config import get_settings
from app.services.llm_client import LiteLLMClient

logger = logging.getLogger(__name__)

_ollama_client: LiteLLMClient | None = None


async def get_ollama_client() -> LiteLLMClient:
    """Backward-compat — returns a LiteLLMClient instance."""
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = LiteLLMClient(
            model=get_settings().ollama_model_reasoner,
            base_url=get_settings().ollama_base_url
        )
    return _ollama_client


async def validate_models() -> dict:
    """Check that configured Ollama models are available locally.

    Fetches the model list from Ollama and logs warnings for any
    configured model that is not found. Never raises — failures are
    logged and returned in the result dict.

    Returns:
        Dict with 'available' (list of found model names) and
        'missing' (list of model names to pull).
    """
    import httpx

    settings = get_settings()
    configured = {
        settings.ollama_model_reasoner,
        settings.ollama_model_embed,
        settings.ollama_model_planner,
    }
    result: dict = {"available": [], "missing": []}

    try:
        base_url = settings.ollama_base_url.rstrip("/")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/tags")
            response.raise_for_status()
            data = response.json()
        local_models = {m["name"] for m in data.get("models", [])}
    except Exception as exc:
        logger.warning(
            "Model validation skipped — cannot reach Ollama at %s: %s",
            settings.ollama_base_url,
            exc,
        )
        result["missing"] = list(configured)
        return result

    for model in sorted(configured):
        if model in local_models:
            result["available"].append(model)
            logger.info("Ollama model found: %s", model)
        else:
            result["missing"].append(model)
            logger.warning(
                "Ollama model '%s' not found — run: ollama pull %s",
                model,
                model,
            )

    return result
