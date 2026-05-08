from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    system_prompt: str | None = Field(default=None, max_length=4000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    system_prompt: str | None = Field(default=None, max_length=4000)


class ProjectRead(BaseModel):
    id: UUID
    name: str
    system_prompt: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
