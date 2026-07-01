import asyncio

import httpx
from sqlalchemy import select

from app.models.user import Project, User
from app.utils.database import AsyncSessionLocal
from app.utils.security import create_access_token, get_password_hash


async def main():
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User))
        user = user_res.scalars().first()
        if not user:
            user = User(email="test@example.com", hashed_password=get_password_hash("test"))
            db.add(user)
            await db.commit()
            await db.refresh(user)

        proj_res = await db.execute(select(Project).where(Project.user_id == user.id))
        proj = proj_res.scalars().first()
        if not proj:
            proj = Project(user_id=user.id, name="Test Project")
            db.add(proj)
            await db.commit()
            await db.refresh(proj)
            
        token = create_access_token(data={"sub": str(user.id)})
        
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {token}"}
            payload = {"message": "hello", "model": "ollama/qwen2.5:7b", "num_ctx": 4096, "num_predict": 2000}
            print(f"Calling POST /api/projects/{proj.id}/chat")
            response = await client.post(
                f"http://127.0.0.1:8000/api/projects/{proj.id}/chat",
                headers=headers,
                json=payload
            )
            print("STATUS:", response.status_code)
            print("BODY:", response.text)

asyncio.run(main())
