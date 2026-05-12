import uuid
from datetime import UTC, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from src.core.database import Base

DOCUMENT_STATUSES = ("pending", "processing", "completed", "failed")
MESSAGE_ROLES = ("user", "assistant", "system")
USER_THEME_PREFERENCES = ("system", "light", "dark")
USER_HOME_TABS = ("chat", "library", "settings")
USER_NEW_CHAT_SCOPE_MODES = ("clear", "remember", "all-completed")


def utcnow():
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    display_name = Column(String(120), nullable=True)
    theme_preference = Column(String(16), default="system", nullable=False)
    default_home_tab = Column(String(16), default="chat", nullable=False)
    sidebar_collapsed = Column(Boolean, default=False, nullable=False)
    new_chat_scope_mode = Column(String(24), default="clear", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    projects = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "theme_preference IN ('system', 'light', 'dark')",
            name="ck_users_theme_preference",
        ),
        CheckConstraint(
            "default_home_tab IN ('chat', 'library', 'settings')",
            name="ck_users_default_home_tab",
        ),
        CheckConstraint(
            "new_chat_scope_mode IN ('clear', 'remember', 'all-completed')",
            name="ck_users_new_chat_scope_mode",
        ),
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String, nullable=False)
    system_prompt = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="projects")
    conversations = relationship(
        "Conversation",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_projects_user_id", "user_id"),)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    project = relationship("Project", back_populates="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    __table_args__ = (Index("ix_conversations_project_id", "project_id"),)


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant', 'system')", name="ck_messages_role"),
        Index("ix_messages_conversation_id_created_at", "conversation_id", "created_at"),
    )


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename = Column(String, nullable=False)
    mime_type = Column(String)
    source_bytes = Column(LargeBinary, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_sha256 = Column(String(64), nullable=False, index=True)
    status = Column(String, default="pending", nullable=False)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    processed_at = Column(DateTime(timezone=True))

    project = relationship("Project", back_populates="documents")
    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'processing', 'completed', 'failed')",
            name="ck_documents_status",
        ),
        Index("ix_documents_project_id_status", "project_id", "status"),
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    embedding = Column(Vector(768), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    metadata_ = Column("metadata", JSONB, default=dict, nullable=False)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index("ix_document_chunks_document_id", "document_id"),
        Index(
            "ix_document_chunks_embedding_cosine",
            "embedding",
            postgresql_using="ivfflat",
            postgresql_ops={"embedding": "vector_cosine_ops"},
            postgresql_with={"lists": 100},
        ),
        Index(
            "ix_document_chunks_content_fts",
            "content",
            postgresql_using="gin",
            postgresql_ops={"content": "gin_trgm_ops"},
        ),
    )
