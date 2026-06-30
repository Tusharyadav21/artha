from datetime import UTC, datetime
from logging import getLogger
from uuid import UUID

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.document import Document, DocumentChunk
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

    async def replace_chunks(
        self,
        document: Document,
        chunks: list[tuple[str, list[float], dict]],
    ) -> None:
        await self.db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
        for index, (content, embedding, metadata) in enumerate(chunks):
            image_path = metadata.pop("image_path", None) if metadata else None
            image_caption = metadata.pop("image_caption", None) if metadata else None
            section_heading = metadata.pop("section_heading", None) if metadata else None
            self.db.add(
                DocumentChunk(
                    document_id=document.id,
                    content=content,
                    embedding=embedding,
                    chunk_index=index,
                    section_heading=section_heading,
                    image_path=image_path,
                    image_caption=image_caption,
                    metadata_=metadata or {},
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
        filters: dict | None = None,
    ) -> list[tuple[DocumentChunk, Document, float]]:
        if document_ids is not None and len(document_ids) == 0:
            return []

        def apply_filters(query):
            query = query.where(
                Document.project_id == project_id,
                Document.status == DocumentStatus.COMPLETED,
            )
            if document_ids:
                query = query.where(Document.id.in_(document_ids))
            if filters:
                if created_after := filters.get("created_after"):
                    query = query.where(Document.created_at >= created_after)
                if created_before := filters.get("created_before"):
                    query = query.where(Document.created_at <= created_before)
                if mime_types := filters.get("mime_types"):
                    query = query.where(Document.mime_type.in_(list(mime_types)))
            return query

        await self.db.execute(text("SET LOCAL ivfflat.probes = 10"))

        distance = DocumentChunk.embedding.cosine_distance(query_embedding).label("distance")
        vector_query = apply_filters(
            select(DocumentChunk, Document, distance)
            .join(Document, DocumentChunk.document_id == Document.id)
        )
        vector_result = await self.db.execute(vector_query.order_by(distance).limit(limit * 3))
        vector_rows = vector_result.all()

        keyword_rows = []
        bm25_rows = []
        if query_text:
            # pg_trgm trigram similarity
            similarity = func.similarity(DocumentChunk.content, query_text).label("similarity")
            keyword_query = apply_filters(
                select(DocumentChunk, Document, similarity)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(DocumentChunk.content.op("%")(query_text))
            )
            keyword_query = keyword_query.order_by(similarity.desc()).limit(limit * 3)
            keyword_result = await self.db.execute(keyword_query)
            keyword_rows = keyword_result.all()

            # pg_bm25 full-text search (ParadeDB) — fall back gracefully if index missing
            try:
                bm25_sql = text("""
                    SELECT dc.id AS chunk_id, d.id AS doc_id,
                           bm25(dc.content, :q) AS bm25_score
                    FROM document_chunks dc
                    JOIN documents d ON d.id = dc.document_id
                    WHERE d.project_id = :pid AND d.status = 'completed'
                      AND dc.content @@ plainto_tsquery('english', :q)
                    ORDER BY bm25_score DESC
                    LIMIT :lim
                """)
                bm25_result = await self.db.execute(
                    bm25_sql,
                    {"q": query_text, "pid": project_id, "lim": limit * 3},
                )
                for row in bm25_result:
                    bm25_rows.append(row)
            except Exception:
                logger.debug("pg_bm25 query failed (index not yet created?), skipping BM25 leg")

        alpha = get_settings().hybrid_search_alpha
        # When BM25 is available, split keyword weight: half trigram, half BM25
        has_bm25 = bool(bm25_rows)
        kw_weight = (1.0 - alpha) * (0.5 if has_bm25 else 1.0)
        bm25_weight = (1.0 - alpha) * 0.5 if has_bm25 else 0.0

        k = 60
        scores = {}
        id_map = {}

        def _build_chunk_doc(chunk_id, doc_id):
            """Lazily fetch chunk+doc from id_map or build a stub if not found."""
            key = (chunk_id, doc_id)
            if key not in id_map:
                # Stub — actual objects looked up from vector_rows/keyword_rows
                return key
            return key

        for rank, (chunk, doc, _) in enumerate(vector_rows):
            key = (chunk.id, doc.id)
            scores[key] = scores.get(key, 0) + (alpha / (k + rank))
            id_map[key] = (chunk, doc)

        for rank, (chunk, doc, _) in enumerate(keyword_rows):
            key = (chunk.id, doc.id)
            scores[key] = scores.get(key, 0) + (kw_weight / (k + rank))
            if key not in id_map:
                id_map[key] = (chunk, doc)

        for rank, row in enumerate(bm25_rows):
            chunk_id = row[0]
            doc_id = row[1]
            key = (chunk_id, doc_id)
            scores[key] = scores.get(key, 0) + (bm25_weight / (k + rank))
            # BM25 returns IDs only; look up the actual objects from previous passes
            if key not in id_map:
                id_map[key] = (chunk_id, doc_id)  # will be replaced below

        # Resolve any stubs from BM25-only results
        resolved_map: dict[tuple, tuple[DocumentChunk, Document]] = {}
        for key in scores:
            entry = id_map.get(key)
            if isinstance(entry[0], DocumentChunk):
                resolved_map[key] = entry  # type: ignore
            else:
                # BM25-only hit — fetch from DB
                chunk_id, doc_id = entry
                chunk = await self.db.get(DocumentChunk, chunk_id)
                doc = await self.db.get(Document, doc_id)
                if chunk and doc:
                    resolved_map[key] = (chunk, doc)

        sorted_keys = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)[:limit]

        return [
            (resolved_map[key][0], resolved_map[key][1], float(scores[key]))
            for key in sorted_keys
        ]
