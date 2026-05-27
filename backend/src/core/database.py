from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

class Base(DeclarativeBase):
    """
    Purpose:
        Base class for all SQLAlchemy ORM models.

    Responsibilities:
        - Provide a common base for table definitions.
        - Enable integration with SQLAlchemy's declarative system.
    """
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Purpose:
        Dependency provider for database sessions.

    Responsibilities:
        - Create a new async session for each request.
        - Ensure the session is closed after the request finishes.

    Returns:
        AsyncGenerator[AsyncSession, None]:
            A generator yielding a database session.

    Flow:
        1. Create a session using AsyncSessionLocal.
        2. Yield the session to the consumer.
        3. Automatically close the session upon generator exit.
    """
    async with AsyncSessionLocal() as session:
        yield session
