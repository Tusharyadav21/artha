import uuid
from datetime import UTC, datetime
from enum import StrEnum

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

# ============================================================================
# UTILS
# ============================================================================


def utcnow() -> datetime:
    return datetime.now(UTC)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
        server_default=func.now(),
    )


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )


# ============================================================================
# ENUMS
# ============================================================================


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class DocumentStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ThemePreference(StrEnum):
    SYSTEM = "system"
    LIGHT = "light"
    DARK = "dark"


class HomeTab(StrEnum):
    CHAT = "chat"
    LIBRARY = "library"
    SETTINGS = "settings"


class ChatScopeMode(StrEnum):
    CLEAR = "clear"
    REMEMBER = "remember"
    ALL_COMPLETED = "all-completed"


class LLMProvider(StrEnum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GROQ = "groq"
    GEMINI = "gemini"
    MISTRAL = "mistral"
    TOGETHER = "together"
    COHERE = "cohere"
    OLLAMA = "ollama"


# ============================================================================
# USER
# ============================================================================


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        index=True,
        nullable=False,
    )

    hashed_password: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    display_name: Mapped[str | None] = mapped_column(String(120))

    theme_preference: Mapped[ThemePreference] = mapped_column(
        Enum(ThemePreference, name="theme_preference_enum"),
        default=ThemePreference.SYSTEM,
        nullable=False,
    )

    default_home_tab: Mapped[HomeTab] = mapped_column(
        Enum(HomeTab, name="home_tab_enum"),
        default=HomeTab.CHAT,
        nullable=False,
    )

    sidebar_collapsed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    new_chat_scope_mode: Mapped[ChatScopeMode] = mapped_column(
        Enum(ChatScopeMode, name="chat_scope_mode_enum"),
        default=ChatScopeMode.CLEAR,
        nullable=False,
    )

    projects: Mapped[list["Project"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    generated_videos: Mapped[list["GeneratedVideo"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    memories: Mapped[list["UserMemory"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    llm_config: Mapped["UserLLMConfig | None"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )


# ============================================================================
# USER MEMORY
# ============================================================================


class UserMemory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_memories"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        back_populates="memories",
    )



# ============================================================================
# PROJECT
# ============================================================================


class Project(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    system_prompt: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="projects")

    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )

    documents: Mapped[list["Document"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "name",
            name="uq_projects_user_name",
        ),
    )


# ============================================================================
# CONVERSATION
# ============================================================================


class Conversation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "conversations"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str | None] = mapped_column(String(255))

    project: Mapped["Project"] = relationship(
        back_populates="conversations",
    )

    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


# ============================================================================
# MESSAGE
# ============================================================================


class Message(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[MessageRole] = mapped_column(
        Enum(MessageRole, name="message_role_enum"),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    metadata_: Mapped[dict] = mapped_column(
        "metadata",
        MutableDict.as_mutable(JSONB),
        default=dict,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
        server_default=func.now(),
    )

    conversation: Mapped["Conversation"] = relationship(
        back_populates="messages",
    )

    __table_args__ = (
        Index(
            "ix_messages_conversation_created",
            "conversation_id",
            "created_at",
        ),
    )


# ============================================================================
# DOCUMENT
# ============================================================================


class Document(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "documents"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    filename: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )

    mime_type: Mapped[str | None] = mapped_column(
        String(255),
    )

    # Better moved to object storage eventually
    source_bytes: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False,
        deferred=True,
    )

    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    content_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )

    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status_enum"),
        default=DocumentStatus.PENDING,
        nullable=False,
    )

    error_message: Mapped[str | None] = mapped_column(Text)

    extracted_metadata: Mapped[dict | None] = mapped_column(
        "extracted_metadata",
        MutableDict.as_mutable(JSONB),
    )

    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    project: Mapped["Project"] = relationship(
        back_populates="documents",
    )

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "ix_documents_project_status",
            "project_id",
            "status",
        ),
    )


# ============================================================================
# DOCUMENT CHUNK
# ============================================================================


class DocumentChunk(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "document_chunks"

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )

    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    embedding: Mapped[list[float]] = mapped_column(
        Vector(1024),
        nullable=False,
    )

    image_path: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
    )

    image_caption: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    metadata_: Mapped[dict] = mapped_column(
        "metadata",
        MutableDict.as_mutable(JSONB),
        default=dict,
        nullable=False,
    )

    document: Mapped["Document"] = relationship(
        back_populates="chunks",
    )

    __table_args__ = (
        UniqueConstraint(
            "document_id",
            "chunk_index",
            name="uq_document_chunk_index",
        ),
        Index(
            "ix_document_chunks_document_id",
            "document_id",
        ),
        Index(
            "ix_document_chunks_embedding_cosine",
            "embedding",
            postgresql_using="ivfflat",
            postgresql_ops={
                "embedding": "vector_cosine_ops",
            },
            postgresql_with={
                "lists": 100,
            },
        ),
    )


# ============================================================================
# GENERATED VIDEO
# ============================================================================


class GeneratedVideo(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "generated_videos"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    video_path: Mapped[str] = mapped_column(
        String(1024),
        nullable=False,
    )

    audio_path: Mapped[str | None] = mapped_column(
        String(1024),
    )

    image_path: Mapped[str | None] = mapped_column(
        String(1024),
    )

    user: Mapped["User"] = relationship(
        back_populates="generated_videos",
    )


# ============================================================================
# USER LLM CONFIG (BYOK)
# ============================================================================


class UserLLMConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_llm_configs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    provider: Mapped[LLMProvider] = mapped_column(
        Enum(LLMProvider, name="llm_provider_enum"),
        nullable=False,
    )

    api_key_encrypted: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False,
    )

    model: Mapped[str | None] = mapped_column(String(120))

    temperature: Mapped[float] = mapped_column(
        Float,
        default=0.7,
        nullable=False,
    )

    max_tokens: Mapped[int] = mapped_column(
        Integer,
        default=2048,
        nullable=False,
    )

    max_retries: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )

    base_delay_s: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
    )

    timeout_s: Mapped[int] = mapped_column(
        Integer,
        default=60,
        nullable=False,
    )

    extra_params: Mapped[dict] = mapped_column(
        MutableDict.as_mutable(JSONB),
        default=dict,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        back_populates="llm_config",
    )
