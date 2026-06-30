from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.schemas.analytics import ProjectAnalytics, UserAnalytics


class AnalyticsRepository:
    """
    Purpose:
        Handles aggregate queries for analytics dashboards.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_project_analytics(self, project_id: str) -> ProjectAnalytics:
        doc_result = await self.db.execute(
            select(
                func.count(Document.id).label("total_documents"),
                func.count(func.nullif(Document.status != "completed", True)).label(
                    "completed_documents"
                ),
            ).where(Document.project_id == project_id)
        )
        doc_row = doc_result.one()

        conv_result = await self.db.execute(
            select(func.count(Conversation.id)).where(
                Conversation.project_id == project_id
            )
        )
        total_conversations = conv_result.scalar() or 0

        msg_result = await self.db.execute(
            select(func.count(Message.id))
            .join(Conversation, Conversation.id == Message.conversation_id)
            .where(Conversation.project_id == project_id)
        )
        total_messages = msg_result.scalar() or 0

        return ProjectAnalytics(
            project_id=project_id,
            total_documents=doc_row.total_documents or 0,
            completed_documents=doc_row.completed_documents or 0,
            total_conversations=total_conversations,
            total_messages=total_messages,
        )

    async def get_user_analytics(self, user_id: UUID) -> UserAnalytics:
        doc_result = await self.db.execute(
            select(
                func.count(Document.id).label("total_documents"),
                func.count(func.nullif(Document.status != "completed", True)).label(
                    "completed_documents"
                ),
            )
            .join(Document.project)
            .where(Document.project.has(user_id=user_id))
        )
        doc_row = doc_result.one()

        conv_result = await self.db.execute(
            select(func.count(Conversation.id))
            .join(Conversation.project)
            .where(Conversation.project.has(user_id=user_id))
        )
        total_conversations = conv_result.scalar() or 0

        msg_result = await self.db.execute(
            select(func.count(Message.id))
            .join(Conversation, Conversation.id == Message.conversation_id)
            .join(Conversation.project)
            .where(Conversation.project.has(user_id=user_id))
        )
        total_messages = msg_result.scalar() or 0

        recent_msg_result = await self.db.execute(
            select(Message.created_at)
            .join(Conversation, Conversation.id == Message.conversation_id)
            .join(Conversation.project)
            .where(Conversation.project.has(user_id=user_id))
            .order_by(Message.created_at.desc())
            .limit(100)
        )
        recent_timestamps = recent_msg_result.scalars().all()

        daily_counts: dict[str, int] = {}
        for ts in recent_timestamps:
            day = ts.strftime("%Y-%m-%d")
            daily_counts[day] = daily_counts.get(day, 0) + 1

        daily_queries = [
            {"date": k, "count": v} for k, v in sorted(daily_counts.items())
        ]

        return UserAnalytics(
            total_documents=doc_row.total_documents or 0,
            completed_documents=doc_row.completed_documents or 0,
            total_conversations=total_conversations,
            total_messages=total_messages,
            daily_queries=daily_queries,
        )
