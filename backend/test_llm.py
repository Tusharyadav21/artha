import asyncio
from uuid import UUID
from app.utils.database import AsyncSessionLocal
from app.services.llm_factory import get_llm_for_user
from app.services.repositories.users import UserRepository

async def main():
    async with AsyncSessionLocal() as db:
        user = await UserRepository(db).get_by_email("test@example.com")
        if not user:
            users = await UserRepository(db).get_all()
            if not users:
                print("No users")
                return
            user = users[0]
        
        try:
            llm = await get_llm_for_user(user.id, db)
            print("SUCCESS", llm)
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(main())
