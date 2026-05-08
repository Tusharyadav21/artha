from uuid import UUID

from arq.connections import RedisSettings

from src.core.config import get_settings
from src.core.database import AsyncSessionLocal
from src.repositories.documents import DocumentRepository
from src.services.ingestion import chunk_text, embed_chunks, parse_document_bytes


async def startup(ctx: dict) -> None:
    pass


async def shutdown(ctx: dict) -> None:
    pass


async def process_document(ctx: dict, document_id: str) -> None:
    async with AsyncSessionLocal() as db:
        repository = DocumentRepository(db)
        document = await repository.get(UUID(document_id))
        if document is None:
            return

        await repository.set_status(document, "processing")
        try:
            text = parse_document_bytes(
                document.source_bytes,
                document.mime_type,
                document.filename,
            )
            chunks = chunk_text(text)
            embedded_chunks = await embed_chunks(chunks)
            await repository.replace_chunks(document, embedded_chunks)
            await repository.set_status(document, "completed", processed=True)
        except Exception as exc:
            await repository.set_status(document, "failed", error_message=str(exc), processed=True)


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    functions = [process_document]
    on_startup = startup
    on_shutdown = shutdown
