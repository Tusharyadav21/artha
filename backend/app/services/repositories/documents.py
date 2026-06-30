from datetime import UTC, datetime
from logging import getLogger
from uuid import UUID

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.document import Document
from app.models.enums import DocumentStatus

logger = getLogger(__name__)


class DocumentRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        project_id: UUID,
        filename: str,
        mime_type: str | None,
        source_bytes: bytes,
        content_sha256: str,
    ) -> Document:
        document = Document(
            project_id=project_id,
            filename=filename,
            mime_type=mime_type,
            source_bytes=source_bytes,
            file_size=len(source_bytes),
            content_sha256=content_sha256,
            status=DocumentStatus.PENDING,
            ingestion_version=get_settings().ingestion_version,
        )
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def get(self, document_id: UUID) -> Document | None:
        return await self.db.get(Document, document_id)

    async def get_for_project(self, document_id: UUID, project_id: UUID) -> Document | None:
        result = await self.db.execute(
            select(Document).where(Document.id == document_id, Document.project_id == project_id)
        )
        return result.scalar_one_or_none()

    async def get_by_sha256(self, project_id: UUID, content_sha256: str) -> Document | None:
        result = await self.db.execute(
            select(Document).where(
                Document.project_id == project_id,
                Document.content_sha256 == content_sha256,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_project(
        self, project_id: UUID, skip: int = 0, limit: int = 100,
    ) -> tuple[list[Document], int]:
        total = await self.db.scalar(
            select(func.count()).select_from(Document).where(Document.project_id == project_id)
        )
        result = await self.db.execute(
            select(Document)
            .where(Document.project_id == project_id)
            .order_by(Document.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total or 0

    async def update(self, document: Document, **kwargs) -> Document:
        for key, value in kwargs.items():
            if hasattr(document, key):
                setattr(document, key, value)
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def delete(self, document: Document) -> None:
        await self.db.delete(document)
        await self.db.commit()

    async def set_status(
        self,
        document: Document,
        status: DocumentStatus,
        error_message: str | None = None,
        processed: bool = False,
    ) -> Document:
        update_data: dict[str, str | bool | datetime] = {
            "status": status,
            "error_message": error_message,
            "updated_at": datetime.now(UTC),
        }
        if processed:
            update_data["processed_at"] = datetime.now(UTC)
        return await self.update(document, **update_data)


