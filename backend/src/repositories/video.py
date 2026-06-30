from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import GeneratedVideo


class VideoRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_user(self, user_id: UUID) -> list[GeneratedVideo]:
        result = await self.db.execute(
            select(GeneratedVideo)
            .where(GeneratedVideo.user_id == user_id)
            .order_by(GeneratedVideo.created_at.desc())
        )
        return list(result.scalars().all())
