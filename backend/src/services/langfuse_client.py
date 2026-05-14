"""Shared Langfuse client — initialised once at module import time.

The client is skipped gracefully (returns None-safe stubs) if no API keys
are configured, so the app runs fine in environments without Langfuse.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from src.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_langfuse():
    """Return a configured Langfuse instance, or None if not set up."""
    settings = get_settings()

    if not settings.langfuse_public_key or not settings.langfuse_secret_key:
        logger.info("Langfuse keys not configured — tracing disabled")
        return None

    try:
        from langfuse import Langfuse  # type: ignore

        host = settings.langfuse_host or "http://localhost:3001"
        client = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=host,
            enabled=True,
        )
        logger.info("Langfuse tracing enabled → %s", host)
        return client
    except Exception as exc:
        logger.warning("Failed to initialise Langfuse client: %s", exc)
        return None
