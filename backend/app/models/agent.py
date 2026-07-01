from __future__ import annotations

import uuid


from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ToolAuthType
from app.utils.database import Base


class Workspace(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )


class ModelRegistry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "model_registry"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(String(120), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_url: Mapped[str | None] = mapped_column(String(1024))
    context_window: Mapped[int | None] = mapped_column(Integer)
    supports_tools: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PromptTemplate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "prompt_templates"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(50), default="1.0", nullable=False)
    template_text: Mapped[str] = mapped_column(Text, nullable=False)
    model_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("model_registry.id", ondelete="SET NULL"),
        index=True,
    )
    temperature: Mapped[float] = mapped_column(Float, default=0.7, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "workspace_id", "name", "version", name="uq_prompt_workspace_name_version"
        ),
    )


class Tool(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tools"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    endpoint_url: Mapped[str | None] = mapped_column(String(1024))
    auth_type: Mapped[ToolAuthType] = mapped_column(
        Enum(ToolAuthType, name="tool_auth_type_enum"),
        default=ToolAuthType.NONE,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_tool_workspace_name"),
    )


class Agent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "agents"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    routing_description: Mapped[str | None] = mapped_column(Text)
    workflow_definition: Mapped[dict | None] = mapped_column(
        MutableDict.as_mutable(JSONB), default=dict
    )
    version: Mapped[str] = mapped_column(String(50), default="1.0", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    __table_args__ = (
        UniqueConstraint(
            "workspace_id", "name", "version", name="uq_agent_workspace_name_version"
        ),
    )


class AgentPrompt(Base):
    __tablename__ = "agent_prompts"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True
    )
    prompt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("prompt_templates.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "role IN ('system', 'user', 'assistant')",
            name="ck_agent_prompt_role",
        ),
    )


class AgentTool(Base):
    __tablename__ = "agent_tools"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True
    )
    tool_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tools.id", ondelete="CASCADE"), primary_key=True
    )


class AgentMemory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "agent_memories"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict] = mapped_column(
        "metadata", MutableDict.as_mutable(JSONB), default=dict, nullable=False
    )

    source: Mapped[str | None] = mapped_column(String(255))
