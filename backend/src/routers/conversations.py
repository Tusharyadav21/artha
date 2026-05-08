from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.core.database import get_db
from src.domain.models import User
from src.repositories.conversations import ConversationRepository
from src.repositories.projects import ProjectRepository
from src.schemas.chat import ConversationDetail, ConversationRead

router = APIRouter(prefix="/api/projects/{project_id}/conversations", tags=["conversations"])


async def _ensure_project(db: AsyncSession, project_id: UUID, user_id: UUID) -> None:
    if await ProjectRepository(db).get_for_user(project_id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


@router.get("", response_model=list[ConversationRead])
async def list_conversations(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _ensure_project(db, project_id, current_user.id)
    return await ConversationRepository(db).list_for_project(project_id)


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    project_id: UUID,
    conversation_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _ensure_project(db, project_id, current_user.id)
    conversation = await ConversationRepository(db).get_for_project(conversation_id, project_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation
