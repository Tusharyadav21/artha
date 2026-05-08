from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    conversation_id: UUID | None = None
    message: str = Field(min_length=1, max_length=20_000)


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
    role: str
    content: str
    metadata_: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(ConversationRead):
    messages: list[MessageRead]
