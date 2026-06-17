from logging import getLogger
from uuid import UUID

from arq.connections import RedisSettings

from src.core.config import get_settings
from src.core.database import AsyncSessionLocal
from src.domain.models import DocumentStatus
from src.repositories.documents import DocumentRepository

logger = getLogger(__name__)


async def startup(ctx: dict) -> None:
    logger.info("Worker startup: preparing processing environment")


async def shutdown(ctx: dict) -> None:
    logger.info("Worker shutdown: cleaning up resources")


async def process_document(ctx: dict, document_id: str, embed_model: str | None = None) -> None:
    db = None
    try:
        db = AsyncSessionLocal()
        repository = DocumentRepository(db)
        document = await repository.get(UUID(document_id))
        if document is None:
            logger.warning("Document %s not found, skipping", document_id)
            return

        await db.refresh(document, attribute_names=["source_bytes"])
        source_bytes = document.source_bytes

        logger.info(
            "Processing document %s: %s with embed_model=%s",
            document_id, document.filename, embed_model,
        )
        await repository.set_status(document, DocumentStatus.PROCESSING)

        try:
            from src.agents.ingestion import IngestionState, build_ingestion_graph

            graph = build_ingestion_graph()
            initial_state = IngestionState(
                document_id=document_id,
                source_bytes=source_bytes,
                mime_type=document.mime_type,
                filename=document.filename,
                embed_model=embed_model,
            )

            final_state = await graph.ainvoke(initial_state)

            document.extracted_metadata = final_state.get("metadata") or {}

            embedded_chunks = final_state.get("embedded_chunks") or []

            if not embedded_chunks:
                logger.warning("Document %s: produced no chunks", document_id)

            await repository.replace_chunks(document, embedded_chunks)
            await repository.set_status(document, DocumentStatus.COMPLETED, processed=True)
            logger.info(
                "Document %s: completed successfully with %d chunks",
                document_id, len(embedded_chunks),
            )
        except Exception as exc:
            logger.error("Document %s: processing failed - %s", document_id, exc)
            await repository.set_status(
                document,
                DocumentStatus.FAILED,
                error_message=str(exc),
                processed=True,
            )
            raise
    finally:
        if db:
            await db.close()
            logger.debug("Document %s: session closed", document_id)


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    functions = [process_document]
    on_startup = startup
    on_shutdown = shutdown
    max_tries = 3
    retry_delay = 30
