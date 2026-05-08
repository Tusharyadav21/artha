from logging import getLogger

import httpx
from fastapi import APIRouter
from sqlalchemy import text

from src.core.config import get_settings

logger = getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


async def check_database() -> tuple[bool, str]:
    """Check database connection."""
    try:
        from src.core.database import engine

        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True, "ok"
    except Exception as exc:
        logger.error(f"Database check failed: {exc}")
        return False, str(exc)


async def check_redis() -> tuple[bool, str]:
    """Check Redis connection."""
    try:
        import redis

        redis_url = get_settings().redis_url
        client = redis.from_url(redis_url, socket_timeout=2)
        result = await client.ping()
        await client.aclose()
        return result, "ok"
    except Exception as exc:
        logger.error(f"Redis check failed: {exc}")
        return False, str(exc)


async def check_ollama() -> tuple[bool, str]:
    """Check Ollama service is available."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{get_settings().ollama_base_url}/api/tags")
            if response.status_code == 200:
                return True, "ok"
            return False, f"Ollama returned {response.status_code}"
    except Exception as exc:
        logger.error(f"Ollama check failed: {exc}")
        return False, str(exc)


@router.get("")
async def healthcheck() -> dict[str, str]:
    """Basic health check."""
    return {"status": "ok"}


@router.get("/ready", summary="Readiness probe")
async def readiness_check() -> dict:
    """Readiness probe - checks if service is ready to accept traffic."""
    results = {
        "database": await check_database(),
        "redis": await check_redis(),
        "ollama": await check_ollama(),
    }

    all_healthy = all(status for status, _ in results.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "details": {
            key: {"status": status, "message": message}
            for key, (status, message) in results.items()
        },
    }
