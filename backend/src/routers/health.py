from logging import getLogger

import httpx
from fastapi import APIRouter
from sqlalchemy import text

from src.core.config import get_settings

logger = getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


async def check_database() -> tuple[bool, str]:
    """
    Purpose:
        Verifies connectivity to the PostgreSQL database.

    Returns:
        tuple[bool, str]:
            (True, "ok") if connection is successful, otherwise (False, error_message).

    Flow:
        1. Access database engine.
        2. Execute a simple "SELECT 1" query.
        3. Return status based on success or exception.
    """
    try:
        from src.core.database import engine

        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True, "ok"
    except Exception as exc:
        logger.error(f"Database check failed: {exc}")
        return False, str(exc)


async def check_redis() -> tuple[bool, str]:
    """
    Purpose:
        Verifies connectivity to the Redis cache.

    Returns:
        tuple[bool, str]:
            (True, "ok") if ping is successful, otherwise (False, error_message).

    Flow:
        1. Retrieve Redis URL from settings.
        2. Create a temporary Redis client.
        3. Send a ping command.
        4. Close client and return status.
    """
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
    """
    Purpose:
        Verifies the Ollama LLM service is reachable and responding.

    Returns:
        tuple[bool, str]:
            (True, "ok") if /api/tags returns 200, otherwise (False, error_message).

    Flow:
        1. Initialize an async HTTP client.
        2. Request the tags endpoint from Ollama base URL.
        3. Validate response status code.
        4. Return status based on result.
    """
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
    """
    Purpose:
        Provides a basic Liveness probe for the API.

    Returns:
        dict[str, str]:
            Simple status map indicating the service is alive.
    """
    return {"status": "ok"}


@router.get("/ready", summary="Readiness probe")
async def readiness_check() -> dict:
    """
    Purpose:
        Provides a Readiness probe that checks all critical downstream dependencies.

    Responsibilities:
        - Check PostgreSQL connectivity
        - Check Redis connectivity
        - Check Ollama availability

    Returns:
        dict:
            Object containing overall status ("healthy" or "degraded") and per-service details.

    Flow:
        1. Execute all dependency check functions.
        2. Aggregate results into a detailed map.
        3. Determine overall health based on whether all dependencies are ok.
        4. Return combined status.
    """
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
