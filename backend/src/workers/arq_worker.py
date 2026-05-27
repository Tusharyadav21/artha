from logging import getLogger
from uuid import UUID

from arq.connections import RedisSettings

from src.core.config import get_settings
from src.core.database import AsyncSessionLocal
from src.repositories.documents import DocumentRepository
from src.domain.models import DocumentStatus
from src.services.ingestion import chunk_text_hierarchical, embed_chunks, parse_document_bytes

logger = getLogger(__name__)


async def startup(ctx: dict) -> None:
    """
    Purpose:
        Hook executed by Arq when the worker process starts.

    Responsibilities:
        - Initialize processing environment for background jobs.

    Inputs:
        ctx (dict): Arq context dictionary.

    Outputs:
        None.

    Side effects:
        Logs startup event.
    """
    logger.info("Worker startup: preparing processing environment")


async def shutdown(ctx: dict) -> None:
    """
    Purpose:
        Hook executed by Arq when the worker process terminates.

    Responsibilities:
        - Clean up resources used by background jobs.

    Inputs:
        ctx (dict): Arq context dictionary.

    Outputs:
        None.

    Side effects:
        Logs shutdown event.
    """
    logger.info("Worker shutdown: cleaning up resources")


async def process_document(ctx: dict, document_id: str, embed_model: str | None = None) -> None:
    """
    Purpose:
        Background worker task to process a raw document into searchable embeddings.

    Responsibilities:
        - Update document status to PROCESSING.
        - Parse raw bytes into plain text.
        - Perform hierarchical chunking.
        - Generate embeddings for chunks via Ollama.
        - Persist chunks and mark document as COMPLETED or FAILED.

    Inputs:
        ctx (dict): Arq context dictionary.
        document_id (str): UUID of the document to process.
        embed_model (str | None): Optional override for the embedding model.

    Outputs:
        None.

    Exceptions:
        Propagates any parsing, embedding, or DB errors to Arq for retry/failure handling.

    Side effects:
        - Updates Document record status in database.
        - Inserts/replaces chunks in the documents_chunks table.

    Execution flow:
        1. Create a new AsyncSession.
        2. Retrieve document and set status to PROCESSING.
        3. Extract text using parse_document_bytes.
        4. Split text into hierarchical chunks via chunk_text_hierarchical.
        5. Embed chunks via embed_chunks.
        6. Replace existing chunks in DB with new embeddings.
        7. Mark document as COMPLETED.
        8. On error: Mark document as FAILED with error message.
        9. Close session.
    """
    db = None
    try:
        db = AsyncSessionLocal()
        repository = DocumentRepository(db)
        document = await repository.get(UUID(document_id))
        if document is None:
            logger.warning(f"Document {document_id} not found, skipping")
            return

        logger.info(
            f"Processing document {document_id}: {document.filename} "
            f"with embed_model={embed_model}"
        )
        await repository.set_status(document, DocumentStatus.PROCESSING)

        try:
            text = parse_document_bytes(
                document.source_bytes,
                document.mime_type,
                document.filename,
            )
            logger.debug(f"Document {document_id}: parsed, {len(text)} chars")
            chunks = chunk_text_hierarchical(text)
            logger.debug(f"Document {document_id}: created {len(chunks)} chunks")
            embedded_chunks = await embed_chunks(chunks, embed_model=embed_model)
            logger.debug(f"Document {document_id}: embedded {len(embedded_chunks)} chunks")
            await repository.replace_chunks(document, embedded_chunks)
            await repository.set_status(document, DocumentStatus.COMPLETED, processed=True)
            logger.info(f"Document {document_id}: completed successfully")
        except Exception as exc:
            logger.error(f"Document {document_id}: processing failed - {exc}")
            await repository.set_status(document, DocumentStatus.FAILED, error_message=str(exc), processed=True)
            raise
    finally:
        if db:
            await db.close()
            logger.debug(f"Document {document_id}: session closed")


class WorkerSettings:
    """
    Purpose:
        Configuration class for the Arq worker instance.

    Responsibilities:
        - Define Redis connection settings.
        - Register task functions for the worker to execute.
        - Define startup and shutdown lifecycle hooks.

    Dependencies:
        - RedisSettings for connection management.
        - Global app settings for Redis URL.

    Architectural constraints:
        - Must be kept in sync with the task names enqueued by the API.
    """
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    functions = [process_document]
    on_startup = startup
    on_shutdown = shutdown
