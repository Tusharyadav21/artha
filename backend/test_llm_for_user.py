import asyncio
import uuid

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.services.llm_factory import get_llm_for_user
from app.utils.logging import configure_logging

configure_logging("DEBUG")

async def main():
    engine = create_async_engine("postgresql+asyncpg://ragapp:ragapp@localhost:5435/ragapp")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        user_id = uuid.uuid4()
        client = await get_llm_for_user(user_id, session)
        print("Resolved base_url:", client._base_url)
        print("Resolved model:", client._model)
        print("Resolved embed_model:", client._embed_model)
        
        try:
            print("Calling embed...")
            res = await client.embed("test")
            print("Embed success!")
        except Exception as e:
            print("Embed failed:", type(e), str(e))
            
        try:
            print("Calling generate...")
            res = await client.generate("test")
            print("Generate success!")
        except Exception as e:
            print("Generate failed:", type(e), str(e))

asyncio.run(main())
