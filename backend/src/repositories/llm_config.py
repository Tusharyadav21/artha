from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import UserLLMConfig


class LLMConfigRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_user(self, user_id: UUID) -> UserLLMConfig | None:
        result = await self.db.execute(
            select(UserLLMConfig).where(UserLLMConfig.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def upsert(self, user_id: UUID, **fields) -> UserLLMConfig:
        existing = await self.get_by_user(user_id)
        if existing:
            for key, value in fields.items():
                setattr(existing, key, value)
            await self.db.flush()
            return existing
        config = UserLLMConfig(user_id=user_id, **fields)
        self.db.add(config)
        await self.db.flush()
        await self.db.refresh(config)
        return config

    async def delete(self, user_id: UUID) -> bool:
        config = await self.get_by_user(user_id)
        if config is None:
            return False
        await self.db.delete(config)
        await self.db.flush()
        return True
