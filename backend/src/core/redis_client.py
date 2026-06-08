from logging import getLogger

import redis.asyncio as redis

from src.core.config import get_settings

logger = getLogger(__name__)

_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    """
    Purpose:
        Provides a process-wide, lazily initialized async Redis client.

    Returns:
        redis.Redis:
            The shared Redis client instance.

    Flow:
        1. Check if the global _client is already initialized.
        2. If not, create a new Redis client using settings.redis_url.
        3. Return the client.
    """
    global _client
    if _client is None:
        _client = redis.from_url(
            get_settings().redis_url,
            decode_responses=False,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )
    return _client


async def close_redis() -> None:
    """
    Purpose:
        Closes the shared Redis client and resets the global instance.

    Responsibilities:
        - Ensure active Redis connections are terminated gracefully.

    Returns:
        None

    Side Effects:
        - Closes the _client connection.
        - Sets _client to None.
    """
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
