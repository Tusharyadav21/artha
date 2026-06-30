from logging import getLogger

import redis.asyncio as redis

from app.config import get_settings

logger = getLogger(__name__)

_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
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
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
