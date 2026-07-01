from contextlib import asynccontextmanager
from typing import AsyncGenerator

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool

from app.config import get_settings

settings = get_settings()

# Convert SQLAlchemy asyncpg URL to standard psycopg URL
# e.g., postgresql+asyncpg://user:pass@host/db -> postgresql://user:pass@host/db
psycopg_url = settings.database_url.replace("+asyncpg", "")

@asynccontextmanager
async def get_memory_saver() -> AsyncGenerator[AsyncPostgresSaver, None]:
    """
    Context manager to yield a persistent Postgres-backed memory saver for LangGraph.
    """
    async with AsyncConnectionPool(
        conninfo=psycopg_url,
        max_size=10,
        kwargs={
            "autocommit": True,
            "prepare_threshold": 0,
        }
    ) as pool:
        saver = AsyncPostgresSaver(pool)
        # Ensure the schema exists
        await saver.setup()
        yield saver
