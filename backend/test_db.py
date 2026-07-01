import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


async def main():
    engine = create_async_engine("postgresql+asyncpg://ragapp:ragapp@localhost:5435/ragapp")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        result = await session.execute(text("SELECT * FROM user_llm_configs;"))
        rows = result.fetchall()
        print("Configs:", rows)

asyncio.run(main())
