from datetime import UTC, datetime
from logging import getLogger
from uuid import UUID

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Document, DocumentChunk, DocumentStatus

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

    async def list_for_project(
        self,
        project_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Document], int]:
        from sqlalchemy import func

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
        """Atomically update document fields."""
        for key, value in kwargs.items():
            if hasattr(document, key):
                setattr(document, key, value)
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        return document

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
        query_text: str | None = None,
        limit: int = 6,
        document_ids: list[UUID] | None = None,
    ) -> list[tuple[DocumentChunk, Document, float]]:
        """Perform hybrid search (Vector + Keyword) using Reciprocal Rank Fusion (RRF)."""
        
        # 1. Vector Search
        distance = DocumentChunk.embedding.cosine_distance(query_embedding).label("distance")
        vector_query = (
            select(DocumentChunk, Document, distance)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(Document.project_id == project_id, Document.status == DocumentStatus.COMPLETED)
        )
        if document_ids:
            vector_query = vector_query.where(Document.id.in_(document_ids))
        
        vector_result = await self.db.execute(vector_query.order_by(distance).limit(limit * 3))
        vector_rows = vector_result.all()

        # 2. Keyword Search (Trigram Similarity)
        keyword_rows = []
        if query_text:
            similarity = func.similarity(DocumentChunk.content, query_text).label("similarity")
            keyword_query = (
                select(DocumentChunk, Document, similarity)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(Document.project_id == project_id, Document.status == DocumentStatus.COMPLETED)
                .where(DocumentChunk.content.op("%")(query_text)) # Use trigram match
            )
            if document_ids:
                keyword_query = keyword_query.where(Document.id.in_(document_ids))
            
            keyword_result = await self.db.execute(keyword_query.order_by(similarity.desc()).limit(limit * 3))
            keyword_rows = keyword_result.all()

        # 3. Reciprocal Rank Fusion (RRF)
        # score = sum(1 / (k + rank))
        k = 60
        scores = {} # (chunk_id, doc_id) -> float
        id_map = {} # (chunk_id, doc_id) -> (DocumentChunk, Document)
        
        for rank, (chunk, doc, _) in enumerate(vector_rows):
            key = (chunk.id, doc.id)
            scores[key] = scores.get(key, 0) + (1.0 / (k + rank))
            id_map[key] = (chunk, doc)
            
        for rank, (chunk, doc, _) in enumerate(keyword_rows):
            key = (chunk.id, doc.id)
            scores[key] = scores.get(key, 0) + (1.0 / (k + rank))
            id_map[key] = (chunk, doc)

        # Sort by RRF score descending
        sorted_keys = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)[:limit]
        
        return [(id_map[key][0], id_map[key][1], float(scores[key])) for key in sorted_keys]
