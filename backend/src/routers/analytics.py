from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.core.database import get_db
from src.domain.models import Conversation, Document, Message, User
from src.schemas.analytics import ProjectAnalytics, UserAnalytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/projects/{project_id}", response_model=ProjectAnalytics)
async def get_project_analytics(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    doc_result = await db.execute(
        select(
            func.count(Document.id).label("total_documents"),
            func.count(func.nullif(Document.status != "completed", True)).label("completed_documents"),
        ).where(Document.project_id == project_id)
    )
    doc_row = doc_result.one()

    conv_result = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.project_id == project_id)
    )
    total_conversations = conv_result.scalar() or 0

    msg_result = await db.execute(
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


@router.get("/user", response_model=UserAnalytics)
async def get_user_analytics(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    doc_result = await db.execute(
        select(
            func.count(Document.id).label("total_documents"),
            func.count(func.nullif(Document.status != "completed", True)).label("completed_documents"),
        )
        .join(Document.project)
        .where(Document.project.has(user_id=current_user.id))
    )
    doc_row = doc_result.one()

    conv_result = await db.execute(
        select(func.count(Conversation.id))
        .join(Conversation.project)
        .where(Conversation.project.has(user_id=current_user.id))
    )
    total_conversations = conv_result.scalar() or 0

    msg_result = await db.execute(
        select(func.count(Message.id))
        .join(Conversation, Conversation.id == Message.conversation_id)
        .join(Conversation.project)
        .where(Conversation.project.has(user_id=current_user.id))
    )
    total_messages = msg_result.scalar() or 0

    recent_msg_result = await db.execute(
        select(Message.created_at)
        .join(Conversation, Conversation.id == Message.conversation_id)
        .join(Conversation.project)
        .where(Conversation.project.has(user_id=current_user.id))
        .order_by(Message.created_at.desc())
        .limit(100)
    )
    recent_timestamps = recent_msg_result.scalars().all()

    daily_counts: dict[str, int] = {}
    for ts in recent_timestamps:
        day = ts.strftime("%Y-%m-%d")
        daily_counts[day] = daily_counts.get(day, 0) + 1

    daily_queries = [{"date": k, "count": v} for k, v in sorted(daily_counts.items())]

    return UserAnalytics(
        total_documents=doc_row.total_documents or 0,
        completed_documents=doc_row.completed_documents or 0,
        total_conversations=total_conversations,
        total_messages=total_messages,
        daily_queries=daily_queries,
    )
