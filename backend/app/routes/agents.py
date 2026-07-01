import logging
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas.chat import ChatRequest
from app.models.user import User
from app.services.agents.runtime import AgentRuntime
from app.services.llm_factory import get_llm_for_user
from app.services.repositories.platform import PlatformRepository
from app.utils.database import get_db
from app.utils.dependencies import get_current_user
from app.utils.sse import sse_event

router = APIRouter(prefix="/api/v1/agents", tags=["Platform APIs"])
logger = logging.getLogger(__name__)


async def _verify_workspace_access(workspace_id: UUID, user_id: UUID, db: AsyncSession) -> None:
    repo = PlatformRepository(db)
    if not await repo.get_workspace(workspace_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace not found or access denied",
        )


@router.post("/{workspace_id}/execute")
async def execute_agent(
    workspace_id: UUID,
    payload: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """
    Public API endpoint for SDK consumers to execute agents dynamically.
    """
    await _verify_workspace_access(workspace_id, current_user.id, db)
    llm_client = await get_llm_for_user(current_user.id, db)

    async def stream():
        runtime = AgentRuntime(db, llm_client)
        try:
            conv_id = payload.conversation_id or uuid4()

            async for chunk in runtime.execute(
                user_input=payload.message,
                conversation_id=conv_id,
                workspace_id=workspace_id,
            ):
                yield sse_event("data", chunk)
        except Exception as e:
            logger.error("Execution failed: %s", e)
            yield sse_event("error", {"detail": str(e)})
        finally:
            await llm_client.close()

    return StreamingResponse(stream(), media_type="text/event-stream")
