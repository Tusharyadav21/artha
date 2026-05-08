from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Document, DocumentChunk


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
            status="pending",
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

    async def list_for_project(self, project_id: UUID) -> list[Document]:
        result = await self.db.execute(
            select(Document)
            .where(Document.project_id == project_id)
            .order_by(Document.created_at.desc())
        )
        return list(result.scalars().all())

    async def set_status(
        self,
        document: Document,
        status: str,
        error_message: str | None = None,
        processed: bool = False,
    ) -> Document:
        document.status = status
        document.error_message = error_message
        document.updated_at = datetime.now(UTC)
        if processed:
            document.processed_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def replace_chunks(
        self,
        document: Document,
        chunks: list[tuple[str, list[float], dict]],
    ) -> None:
        await self.db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
        for index, (content, embedding, metadata) in enumerate(chunks):
            self.db.add(
                DocumentChunk(
                    document_id=document.id,
                    content=content,
                    embedding=embedding,
                    chunk_index=index,
                    metadata_=metadata,
                )
            )
        await self.db.commit()

    async def search_chunks(
        self,
        project_id: UUID,
        query_embedding: list[float],
        limit: int = 6,
    ) -> list[tuple[DocumentChunk, Document, float]]:
        distance = DocumentChunk.embedding.cosine_distance(query_embedding).label("distance")
        result = await self.db.execute(
            select(DocumentChunk, Document, distance)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(Document.project_id == project_id, Document.status == "completed")
            .order_by(distance)
            .limit(limit)
        )
        return [(chunk, document, float(score)) for chunk, document, score in result.all()]
