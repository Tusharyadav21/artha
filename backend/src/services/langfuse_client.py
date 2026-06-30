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
    """
    Purpose:
        Singleton provider for the Langfuse tracing client.

    Responsibilities:
        - Validate presence of API keys from settings.
        - Instantiate and configure the Langfuse client.
        - Handle initialization failures gracefully.

    Inputs:
        None.

    Outputs:
        Langfuse | None: Configured client if keys exist and initialization succeeds,
            otherwise None.

    Execution flow:
        1. Fetch settings.
        2. Check for public and secret keys.
        3. Attempt to instantiate Langfuse with host and keys.
        4. Return client or None on failure.
    """
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
