import uuid
from datetime import datetime, UTC
from enum import StrEnum

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    CheckConstraint,
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
    """
    Purpose:
        Returns current UTC datetime for consistent timestamping across the system.
    """
    return datetime.now(UTC)


class TimestampMixin:
    """
    Purpose:
        Provides standardized creation and update timestamps.

    Responsibilities:
        - Manage created_at and updated_at columns with server-side defaults.
    """
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
    """
    Purpose:
        Standardizes UUID-based primary keys.

    Responsibilities:
        - Ensure all inheriting models use UUID4 for IDs.
    """
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )


# ============================================================================
# ENUMS
# ============================================================================


class MessageRole(StrEnum):
    """Purpose: Defines the role of a message sender in a conversation."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class DocumentStatus(StrEnum):
    """Purpose: Tracks the processing lifecycle of an uploaded document."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ThemePreference(StrEnum):
    """Purpose: Stores user-selected UI theme settings."""
    SYSTEM = "system"
    LIGHT = "light"
    DARK = "dark"


class HomeTab(StrEnum):
    """Purpose: Defines the default landing tab for the user interface."""
    CHAT = "chat"
    LIBRARY = "library"
    SETTINGS = "settings"


class ChatScopeMode(StrEnum):
    """Purpose: Controls the scope of new chat sessions (clear vs remember)."""
    CLEAR = "clear"
    REMEMBER = "remember"
    ALL_COMPLETED = "all-completed"


class LLMProvider(StrEnum):
    """Purpose: Identifies which LLM provider backs a user's BYOK configuration."""
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
    """
    Purpose:
        Central entity for user authentication and preferences.

    Responsibilities:
        - Manage account identity and unique email constraints.
        - Securely store hashed passwords.
        - Persist UI and session preferences.

    Dependencies:
        - SQLAlchemy Base.

    Architectural constraints:
        - Email addresses must be unique and normalized to lowercase.
    """
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
    """
    Purpose:
        Stores long-term facts, preferences, and corrections for a user.

    Responsibilities:
        - Provide personalized context for future RAG queries.
    """
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
    """
    Purpose:
        Logical container for documents and conversations.

    Responsibilities:
        - Isolate documents and chat history per user and project.
        - Manage project-specific system prompts for RAG.

    Dependencies:
        - User model for ownership.

    Architectural constraints:
        - All entities (Documents, Conversations) must be scoped to a Project.
        - Enforce unique project names per user.
    """
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
    """
    Purpose:
        Represents a discrete chat session within a project.

    Responsibilities:
        - Group messages chronologically.
        - Associate session metadata (title) with a project.

    Dependencies:
        - Project model for scoping.

    Architectural constraints:
        - Must be strictly linked to a Project via ForeignKey.
    """
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
    """
    Purpose:
        Stores individual chat turns within a conversation.

    Responsibilities:
        - Track sender role (User, Assistant, System).
        - Store text content and structured metadata (citations, feedback).

    Dependencies:
        - Conversation model.

    Architectural constraints:
        - Indexed by conversation_id and created_at for efficient chronological retrieval.
    """
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
    """
    Purpose:
        Represents an uploaded source file.

    Responsibilities:
        - Track raw file content and MIME type.
        - Manage processing lifecycle (PENDING -> PROCESSING -> COMPLETED/FAILED).
        - Store content hashes for deduplication.

    Dependencies:
        - Project model.

    Architectural constraints:
        - Status transitions must be strictly managed by the ingestion worker.
        - Source bytes stored as LargeBinary (migration to object storage pending).
    """
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
    """
    Purpose:
        Smallest unit of a document used for semantic search.

    Responsibilities:
        - Store text chunks and their corresponding high-dimensional embeddings.
        - Maintain chunk ordering relative to the parent document.

    Dependencies:
        - Document model.
        - pgvector extension for vector storage.

    Architectural constraints:
        - Embedding must be exactly 768 dimensions.
        - Unique constraint on (document_id, chunk_index).
    """
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
        Vector(768),
        nullable=False,
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
    """
    Purpose:
        Tracks metadata of videos produced by the generation pipeline.

    Responsibilities:
        - Store paths to the final mp4 file and associated audio/image assets.
        - Link generated content to the requesting user.

    Dependencies:
        - User model.

    Architectural constraints:
        - Paths are stored as strings; assumes file system or object storage consistency.
    """
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
    """
    Purpose:
        Stores per-user LLM provider configuration for Bring-Your-Own-Key support.

    Responsibilities:
        - Persist the chosen provider and encrypted API key.
        - Store generation parameters (temperature, max_tokens) and retry settings.
        - One config per user; upserted on save.

    Architectural constraints:
        - api_key_encrypted must always be Fernet-encrypted before insert.
        - One-to-one with User; deleting the user cascades to this record.
    """
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
