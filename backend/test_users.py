import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


async def main():
    engine = create_async_engine("postgresql+asyncpg://ragapp:ragapp@localhost:5435/ragapp")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        result = await session.execute(text("SELECT id, email FROM users;"))
        print("Users:", result.fetchall())
        result = await session.execute(text("SELECT user_id, provider, extra_params FROM user_llm_configs;"))
        print("Configs:", result.fetchall())

asyncio.run(main())
