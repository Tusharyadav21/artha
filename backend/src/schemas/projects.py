from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """
    Purpose:
        Schema for creating a new project.

    Attributes:
        name (str): Name of the project.
        system_prompt (str | None): Optional custom system prompt for the project's RAG agent.
    """
    name: str = Field(min_length=1, max_length=160)
    system_prompt: str | None = Field(default=None, max_length=4000)


class ProjectUpdate(BaseModel):
    """
    Purpose:
        Schema for partial updates to project metadata.

    Attributes:
        name (str | None): Optional new project name.
        system_prompt (str | None): Optional update to the system prompt.
    """
    name: str | None = Field(default=None, min_length=1, max_length=160)
    system_prompt: str | None = Field(default=None, max_length=4000)


class ProjectRead(BaseModel):
    """
    Purpose:
        Sanitized project representation for API responses.

    Attributes:
        id (UUID): Unique project identifier.
        name (str): Project name.
        system_prompt (str | None): Custom system prompt for the project.
        created_at (datetime): Creation timestamp.
    """
    id: UUID
    name: str
    system_prompt: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
