import asyncio
from unittest.mock import MagicMock

from fastapi import Request
from sqlalchemy import select

from app.models.user import Project, User
from app.routes.chat import chat
from app.utils.database import AsyncSessionLocal


async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email=="test2@example.com"))
        user = res.scalars().first()
        if not user:
            user = User(email="test2@example.com", hashed_password="dummy")
            db.add(user)
            await db.commit()
            await db.refresh(user)

        res_p = await db.execute(select(Project).where(Project.user_id==user.id))
        proj = res_p.scalars().first()
        if not proj:
            proj = Project(user_id=user.id, name="Test Project")
            db.add(proj)
            await db.commit()
            await db.refresh(proj)
        
    async with AsyncSessionLocal() as db2:
        mock_req = MagicMock(spec=Request)
        mock_req.app.state.limiter = MagicMock()

        class DummyPayload:
            message = "hello"
            conversation_id = None
            model = "qwen2.5:7b"
            num_ctx = 4096
            num_predict = 2000
            images = None

        req = DummyPayload()
        try:
            res = await chat(mock_req, proj.id, req, user, db2)
            print("Chat succeeded!", res)
            
            async for chunk in res.body_iterator:
                print("CHUNK:", chunk)
                
        except Exception:
            import traceback
            traceback.print_exc()

asyncio.run(main())
