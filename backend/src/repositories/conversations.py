from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.domain.models import Conversation, Message


class ConversationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_project(self, project_id: UUID) -> list[Conversation]:
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.project_id == project_id)
            .order_by(Conversation.updated_at.desc())
        )
        return list(result.scalars().all())

    async def get_for_project(self, conversation_id: UUID, project_id: UUID) -> Conversation | None:
        result = await self.db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.id == conversation_id, Conversation.project_id == project_id)
        )
        return result.scalar_one_or_none()

    async def create(self, project_id: UUID, title: str | None = None) -> Conversation:
        conversation = Conversation(project_id=project_id, title=title)
        self.db.add(conversation)
        await self.db.flush()
        if not conversation.title:
            conversation.title = "New conversation"
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation

    async def add_message(
        self,
        conversation_id: UUID,
        role: str,
        content: str,
        metadata: dict | None = None,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            metadata_=metadata or {},
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message
