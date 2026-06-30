from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import ToolAuthType

# MODEL REGISTRY SCHEMAS

class ModelRegistryCreate(BaseModel):
    name: str
    provider: str
    model_name: str
    base_url: str | None = None
    context_window: int | None = None
    supports_tools: bool = False
    is_active: bool = True


class ModelRegistryResponse(ModelRegistryCreate):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# PROMPT TEMPLATE SCHEMAS

class PromptTemplateCreate(BaseModel):
    name: str
    version: str = "1.0"
    template_text: str
    model_id: UUID | None = None
    temperature: float = 0.7
    is_active: bool = True


class PromptTemplateResponse(PromptTemplateCreate):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# TOOL SCHEMAS

class ToolCreate(BaseModel):
    name: str
    description: str | None = None
    endpoint_url: str | None = None
    auth_type: ToolAuthType = ToolAuthType.NONE
    is_active: bool = True


class ToolResponse(ToolCreate):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# AGENT SCHEMAS

class AgentCreate(BaseModel):
    name: str
    description: str | None = None
    routing_description: str | None = None
    workflow_definition: dict[str, Any] | None = Field(default_factory=dict)
    version: str = "1.0"
    is_active: bool = True


class AgentResponse(AgentCreate):
    id: UUID
    workspace_id: UUID
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
