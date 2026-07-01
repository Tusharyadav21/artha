from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING


from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import DocumentStatus
from app.utils.database import Base

if TYPE_CHECKING:
    from app.models.user import Project


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

    minio_object_name: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
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

    ingestion_version: Mapped[str] = mapped_column(
        String(20),
        default="1",
        nullable=False,
    )

    project: Mapped[Project] = relationship(
        back_populates="documents",
    )

    # Chunks are now stored in Qdrant, so we do not have a relationship here.

    __table_args__ = (
        Index(
            "ix_documents_project_status",
            "project_id",
            "status",
        ),
    )


class DocumentTemplate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "document_templates"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Keywords to match the document against (e.g. "CHASE SAVINGS", "AMEX")
    keywords: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSONB),
        default=list,
        nullable=False,
    )

    # The schema mapping containing bbox coordinates, table areas, etc.
    schema_mapping: Mapped[dict] = mapped_column(
        MutableDict.as_mutable(JSONB),
        default=dict,
        nullable=False,
    )

    project: Mapped[Project] = relationship(
        back_populates="templates",
    )
