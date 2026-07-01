import logging
from uuid import UUID

from app.utils.celery_app import celery_app
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.conversation import ConversationMemory
from app.services.agents.interfaces import MemoryManager as MemoryManagerABC

logger = logging.getLogger(__name__)

_MEMORY_LIMIT = 50


class MemoryManager(MemoryManagerABC):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def load_context(
        self,
        conversation_id: UUID,
        agent_id: UUID,
        workspace_id: UUID,
        limit: int = _MEMORY_LIMIT,
    ) -> dict:
        """
        Load short-term conversation context and long-term agent memory.

        Args:
            conversation_id: Fetch conversation-scoped memories for this conversation.
            agent_id: Fetch agent-scoped memories for this agent.
            workspace_id: Scope agent memories to this workspace.
            limit: Max number of short-term memories to load.

        Returns:
            dict with 'short_term' (list of memory values) and 'long_term' (placeholder).
        """
        logger.info("Loading memory context for conversation %s", conversation_id)

        result = await self.db.execute(
            select(ConversationMemory)
            .where(ConversationMemory.conversation_id == conversation_id)
            .limit(limit)
        )
        short_term = result.scalars().all()

        return {
            "short_term": [m.value for m in short_term],
            "long_term": [],
        }

    async def trigger_background_extraction(
        self,
        conversation_id: UUID,
        agent_id: UUID,
        workspace_id: UUID,
    ) -> None:
        """
        Enqueue an ARQ job to extract memories asynchronously.
        """
        celery_app.send_task(
            "app.tasks.extract_and_store_memory",
            args=[str(conversation_id), str(workspace_id)],
        )
        logger.info(
            "Background memory extraction enqueued for conversation %s "
            "(agent=%s, workspace=%s)",
            conversation_id, agent_id, workspace_id,
        )
