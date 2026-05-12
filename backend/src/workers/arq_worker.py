from logging import getLogger
from uuid import UUID

from arq.connections import RedisSettings

from src.core.config import get_settings
from src.core.database import AsyncSessionLocal
from src.repositories.documents import DocumentRepository
from src.services.ingestion import chunk_text_hierarchical, embed_chunks, parse_document_bytes

logger = getLogger(__name__)


async def startup(ctx: dict) -> None:
    logger.info("Worker startup: preparing processing environment")


async def shutdown(ctx: dict) -> None:
    logger.info("Worker shutdown: cleaning up resources")


async def process_document(ctx: dict, document_id: str) -> None:
    db = None
    try:
        db = AsyncSessionLocal()
        repository = DocumentRepository(db)
        document = await repository.get(UUID(document_id))
        if document is None:
            logger.warning(f"Document {document_id} not found, skipping")
            return

        logger.info(f"Processing document {document_id}: {document.filename}")
        await repository.set_status(document, "processing")

        try:
            text = parse_document_bytes(
                document.source_bytes,
                document.mime_type,
                document.filename,
            )
            logger.debug(f"Document {document_id}: parsed, {len(text)} chars")
            chunks = chunk_text_hierarchical(text)
            logger.debug(f"Document {document_id}: created {len(chunks)} chunks")
            embedded_chunks = await embed_chunks(chunks)
            logger.debug(f"Document {document_id}: embedded {len(embedded_chunks)} chunks")
            await repository.replace_chunks(document, embedded_chunks)
            await repository.set_status(document, "completed", processed=True)
            logger.info(f"Document {document_id}: completed successfully")
        except Exception as exc:
            logger.error(f"Document {document_id}: processing failed - {exc}")
            await repository.set_status(document, "failed", error_message=str(exc), processed=True)
            raise
    finally:
        if db:
            await db.close()
            logger.debug(f"Document {document_id}: session closed")


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    functions = [process_document]
    on_startup = startup
    on_shutdown = shutdown
