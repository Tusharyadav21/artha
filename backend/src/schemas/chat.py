from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field
from src.domain.models import MessageRole


class ChatRequest(BaseModel):
    conversation_id: UUID | None = None
    message: str = Field(min_length=1, max_length=4000)
    document_ids: list[UUID] | None = None
    model: str | None = None
    num_ctx: int | None = None
    num_predict: int | None = None


class FeedbackRequest(BaseModel):
    rating: str = Field(pattern=r"^(up|down)$")
    comment: str | None = Field(default=None, max_length=1000)



class ConversationRead(BaseModel):
    id: UUID
    project_id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageRead(BaseModel):
    id: UUID
    conversation_id: UUID
    role: MessageRole
    content: str
    metadata_: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(ConversationRead):
    messages: list[MessageRead]


class PaginatedConversations(BaseModel):
    items: list[ConversationRead]
    total: int
