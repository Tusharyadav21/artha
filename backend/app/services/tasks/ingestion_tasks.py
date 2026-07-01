from logging import getLogger
from uuid import UUID
import json
from celery import shared_task
from sqlalchemy import select

from app.utils.celery_app import celery_app
from app.config import get_settings
from app.models.enums import DocumentStatus
from app.models.conversation import Conversation
from app.models.user import UserMemory
from app.services.llm_client import LiteLLMClient
from app.services.repositories.documents import DocumentRepository
from app.utils.database import AsyncSessionLocal

logger = getLogger(__name__)

# Re-use the synchronous async runner pattern for Celery, as Celery is sync by default
import asyncio

def run_async(coro):
    """Helper to run async code inside a sync Celery task."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


async def _extract_and_store_memory_async(conversation_id: str, user_id: str) -> None:
    db = None
    try:
        db = AsyncSessionLocal()
        result = await db.execute(select(Conversation).where(Conversation.id == UUID(conversation_id)))
        conversation = result.scalar_one_or_none()
        
        if not conversation or not conversation.messages:
            return
            
        history_str = "\n".join([f"{m.role}: {m.content}" for m in conversation.messages[-6:]])
        prompt = (
            f"\n        Analyze the following recent conversation history and extract any "
            f"lasting facts, user preferences, or explicit corrections the user made.\n"
            f"        Return ONLY a JSON array of strings, where each string is a concise "
            f"memory to retain for this user.\n"
            f"        If there is nothing worth remembering, return an empty array [].\n\n"
            f"        Conversation:\n        {history_str}\n    "
        )
        
        llm = LiteLLMClient(model=f"ollama/{get_settings().ollama_model_planner}") # or fallback if not configured
        memories_json = await llm.generate(prompt, format="json")
        
        if memories_json:
            try:
                memories_list = json.loads(memories_json)
                if isinstance(memories_list, list) and memories_list:
                    for mem in memories_list:
                        new_mem = UserMemory(user_id=UUID(user_id), content=str(mem))
                        db.add(new_mem)
                    await db.commit()
                    logger.info(f"Extracted {len(memories_list)} memories for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to parse memories JSON: {e}")
    except Exception as e:
        logger.error(f"Memory extraction failed: {e}")
    finally:
        if db:
            await db.close()

@celery_app.task(name="app.tasks.extract_and_store_memory")
def extract_and_store_memory_task(conversation_id: str, user_id: str):
    run_async(_extract_and_store_memory_async(conversation_id, user_id))


async def _process_document_async(document_id: str, embed_model: str | None = None) -> None:
    db = None
    try:
        db = AsyncSessionLocal()
        repository = DocumentRepository(db)
        document = await repository.get(UUID(document_id))
        if document is None:
            logger.warning("Document %s not found, skipping", document_id)
            return

        logger.info("Processing document %s: %s with embed_model=%s", document_id, document.filename, embed_model)
        await repository.set_status(document, DocumentStatus.PROCESSING)

        try:
            # 1. Fetch file bytes from MinIO instead of DB
            from app.utils.minio_client import minio_client
            from io import BytesIO
            
            if not document.minio_object_name:
                raise ValueError("Document has no minio_object_name")
                
            response = minio_client.get_object(get_settings().minio_bucket, document.minio_object_name)
            source_bytes = response.read()
            response.close()
            response.release_conn()

            # 2. Run ingestion graph
            from app.services.agents.ingestion import IngestionState, build_ingestion_graph
            graph = build_ingestion_graph()
            initial_state = IngestionState(
                document_id=document_id,
                project_id=str(document.project_id),
                source_bytes=source_bytes,
                mime_type=document.mime_type,
                filename=document.filename,
                embed_model=embed_model,
            )

            final_state = await graph.ainvoke(initial_state)
            document.extracted_metadata = final_state.get("metadata") or {}
            embedded_chunks = final_state.get("embedded_chunks") or []

            if embedded_chunks:
                from qdrant_client import AsyncQdrantClient
                from qdrant_client.http.models import PointStruct
                import uuid
                
                qdrant = AsyncQdrantClient(url=get_settings().qdrant_url)
                points = [
                    PointStruct(
                        id=str(uuid.uuid4()),
                        vector=emb,
                        payload={
                            "content": text,
                            "document_id": str(document.id),
                            "project_id": str(document.project_id),
                            **meta
                        }
                    )
                    for text, emb, meta in embedded_chunks
                ]
                await qdrant.upsert(
                    collection_name="artha_docs",
                    points=points
                )
            else:
                logger.warning("Document %s: produced no chunks", document_id)
            await repository.set_status(document, DocumentStatus.COMPLETED, processed=True)
            logger.info("Document %s: completed successfully with %d chunks", document_id, len(embedded_chunks))
            
        except Exception as exc:
            logger.error("Document %s: processing failed - %s", document_id, exc)
            await repository.set_status(document, DocumentStatus.FAILED, error_message=str(exc), processed=True)
            raise
    finally:
        if db:
            await db.close()

@celery_app.task(name="app.events.document_uploaded")
def process_document_task(document_id: str, embed_model: str | None = None):
    """Replaces the old event dispatch with direct processing in this task"""
    logger.info(f"Received document upload event for {document_id}")
    run_async(_process_document_async(document_id, embed_model))
