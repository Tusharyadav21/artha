from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Conversation, Message


class MessageRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_for_project(self, message_id: UUID, project_id: UUID) -> Message | None:
        result = await self.db.execute(
            select(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(Message.id == message_id, Conversation.project_id == project_id)
        )
        return result.scalar_one_or_none()

    async def update_feedback(
        self,
        message: Message,
        rating: str,
        comment: str | None,
    ) -> Message:
        metadata = dict(message.metadata_ or {})
        metadata["feedback"] = {
            "rating": rating,
            "comment": comment,
        }
        message.metadata_ = metadata
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message
