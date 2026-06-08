from datetime import UTC, datetime
from logging import getLogger
from uuid import UUID

from sqlalchemy import delete, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Document, DocumentChunk, DocumentStatus

logger = getLogger(__name__)


class DocumentRepository:
    """
    Purpose:
        Handles persistence and retrieval of Documents and their associated chunks.

    Responsibilities:
        - Manage Document lifecycle (CRUD).
        - Handle hierarchical chunk storage and replacement.
        - Implement hybrid search (Vector + Keyword) with RRF.
        - Manage document processing status.

    Dependencies:
        - SQLAlchemy AsyncSession for database access.
        - pgvector extension for cosine distance calculations.
        - pg_trgm extension for trigram similarity.

    Architectural constraints:
        - All retrieval operations must be scoped by project_id.
        - Chunks are strictly tied to a single document; replacement is atomic per document.
        - Hybrid search results are fused using Reciprocal Rank Fusion (RRF) to balance semantic and keyword relevance.
    """
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
        """
        Purpose:
            Persist a new document to the database.

        Responsibilities:
            - Instantiate Document entity with initial PENDING status.

        Inputs:
            project_id (UUID): ID of the project owning the document.
            filename (str): Name of the uploaded file.
            mime_type (str | None): MIME type of the file.
            source_bytes (bytes): Raw binary content of the file.
            content_sha256 (str): SHA256 hash of content for deduplication.

        Outputs:
            Document: The created document entity.

        Exceptions:
            SQLAlchemy errors during commit.

        Side effects:
            - Inserts a new row into the documents table.

        Execution flow:
            1. Create Document instance with status=PENDING.
            2. Add to session.
            3. Commit and refresh.
            4. Return document.
        """
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
        """
        Purpose:
            Retrieve a document by its unique identifier.

        Responsibilities:
            - Perform primary key lookup for the Document entity.

        Inputs:
            document_id (UUID): ID of the document.

        Outputs:
            Document | None: The document entity if found, otherwise None.

        Exceptions:
            None explicitly raised.

        Side effects:
            Read-only operation.

        Execution flow:
            1. Call session.get(Document, document_id).
            2. Return result.
        """
        return await self.db.get(Document, document_id)

    async def get_for_project(self, document_id: UUID, project_id: UUID) -> Document | None:
        """
        Purpose:
            Retrieve a document while verifying project ownership.

        Responsibilities:
            - Ensure the document belongs to the specified project.

        Inputs:
            document_id (UUID): ID of the document.
            project_id (UUID): ID of the project for access control.

        Outputs:
            Document | None: The document entity if found and authorized, otherwise None.

        Exceptions:
            None explicitly raised.

        Side effects:
            Read-only operation.

        Execution flow:
            1. Construct select query filtering by document_id and project_id.
            2. Execute and return scalar result.
        """
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
        """
        Purpose:
            Retrieve a paginated list of documents for a specific project.

        Responsibilities:
            - Filter documents by project_id.
            - Sort results by creation date descending.
            - Calculate total count for pagination metadata.

        Inputs:
            project_id (UUID): ID of the project scoping the request.
            skip (int): Number of records to offset.
            limit (int): Maximum number of records to return.

        Outputs:
            tuple[list[Document], int]: A tuple of (document list, total count).

        Exceptions:
            None explicitly raised.

        Side effects:
            Read-only operation.

        Execution flow:
            1. Count total documents for project using func.count().
            2. Execute paginated select query with offset and limit.
            3. Return result scalars and total count.
        """
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
        """
        Purpose:
            Atomically update document fields.

        Responsibilities:
            - Update entity attributes dynamically based on kwargs.

        Inputs:
            document (Document): The document entity to modify.
            **kwargs: Field-value pairs for update.

        Outputs:
            Document: The updated document entity.

        Exceptions:
            SQLAlchemy errors during commit.

        Side effects:
            Modifies an existing row in the documents table.

        Execution flow:
            1. Iterate over kwargs.
            2. Use setattr to update fields if they exist on the entity.
            3. Add entity to session.
            4. Commit and refresh.
            5. Return document.
        """
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
        """
        Purpose:
            Update the processing status and timestamps of a document.

        Responsibilities:
            - Update status, error message, and timestamps.
            - Set processed_at if the document has reached a terminal state.

        Inputs:
            document (Document): The document entity.
            status (DocumentStatus): New status (e.g., PROCESSING, COMPLETED, FAILED).
            error_message (str | None): Error details if status is FAILED.
            processed (bool): Whether the document has finished processing.

        Outputs:
            Document: The updated document entity.

        Exceptions:
            SQLAlchemy errors during update.

        Side effects:
            Modifies the status and timestamp columns in the documents table.

        Execution flow:
            1. Construct update dictionary with status and current UTC time.
            2. If processed is True, add processed_at timestamp.
            3. Call self.update() with the construction data.
            4. Return updated document.
        """
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
        """
        Purpose:
            Atomically replace all chunks associated with a document.

        Responsibilities:
            - Delete all existing chunks for the document.
            - Persist a new set of embeddings and metadata.

        Inputs:
            document (Document): The document to update.
            chunks (list[tuple[str, list[float], dict]]): List of (content, embedding, metadata) tuples.

        Outputs:
            None.

        Exceptions:
            SQLAlchemy errors during deletion or insertion.

        Side effects:
            - Deletes rows from documents_chunks for the given document.
            - Inserts new rows into documents_chunks.

        Execution flow:
            1. Execute delete query for chunks matching document.id.
            2. For each chunk tuple:
               a. Instantiate DocumentChunk entity.
               b. Add to session.
            3. Commit transaction.
        """
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
        filters: dict | None = None,
    ) -> list[tuple[DocumentChunk, Document, float]]:
        """
        Purpose:
            Perform a hybrid search (Vector + Keyword) using Reciprocal Rank Fusion (RRF).

        Responsibilities:
            - Filter by project_id and DocumentStatus.COMPLETED.
            - Execute cosine distance search for semantic relevance.
            - Execute trigram similarity search for keyword relevance.
            - Fuse rankings from both methods using RRF.

        Inputs:
            project_id (UUID): ID of the project scoping the search.
            query_embedding (list[float]): 768-dim embedding of the query.
            query_text (str | None): Raw text query for keyword search.
            limit (int): Number of final results to return.
            document_ids (list[UUID] | None): Optional filter to limit search to specific documents.
            filters (dict | None): Optional metadata filters (created_after, created_before, mime_types).

        Outputs:
            list[tuple[DocumentChunk, Document, float]]: List of (chunk, document, rrf_score) tuples.

        Exceptions:
            SQLAlchemy errors during execution.

        Side effects:
            Read-only operation.

        Execution flow:
            1. Define apply_filters helper to enforce project scope, status, and optional filters.
            2. Vector Search:
               a. Compute cosine distance between query_embedding and DocumentChunk.embedding.
               b. Fetch top (limit * 3) candidates.
            3. Keyword Search:
               a. If query_text exists, compute trigram similarity.
               b. Filter using the % operator for matching.
               c. Fetch top (limit * 3) candidates.
            4. RRF Fusion:
               a. Initialize score map and id map.
               b. Iterate through vector results: score = 1 / (60 + rank).
               c. Iterate through keyword results: score += 1 / (60 + rank).
            5. Sort by fused score descending and return top 'limit' results.
        """
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

        # Ensure IVFFlat scans enough lists for good recall (default probes=1 is too low)
        await self.db.execute(text("SET LOCAL ivfflat.probes = 10"))

        # 1. Vector Search
        distance = DocumentChunk.embedding.cosine_distance(query_embedding).label("distance")
        vector_query = apply_filters(
            select(DocumentChunk, Document, distance)
            .join(Document, DocumentChunk.document_id == Document.id)
        )
        vector_result = await self.db.execute(vector_query.order_by(distance).limit(limit * 3))
        vector_rows = vector_result.all()

        # 2. Keyword Search (Trigram Similarity)
        keyword_rows = []
        if query_text:
            similarity = func.similarity(DocumentChunk.content, query_text).label("similarity")
            keyword_query = apply_filters(
                select(DocumentChunk, Document, similarity)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(DocumentChunk.content.op("%")(query_text))
            )
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
