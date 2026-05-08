import json
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.rag import prepare_rag_context
from src.auth.dependencies import get_current_user
from src.core.database import get_db
from src.core.rate_limit import limiter
from src.domain.models import User
from src.repositories.conversations import ConversationRepository
from src.repositories.messages import MessageRepository
from src.repositories.projects import ProjectRepository
from src.schemas.chat import ChatRequest, FeedbackRequest
from src.services.ollama import OllamaClient

router = APIRouter(prefix="/api/projects/{project_id}/chat", tags=["chat"])


def _event(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@router.post("")
@limiter.limit("20/minute")
async def chat(
    request: Request,
    project_id: UUID,
    payload: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    ollama = OllamaClient()
    try:
        project = await ProjectRepository(db).get_for_user(project_id, current_user.id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        conversation_repository = ConversationRepository(db)
        if payload.conversation_id:
            conversation = await conversation_repository.get_for_project(
                payload.conversation_id,
                project_id,
            )
            if conversation is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found",
                )
        else:
            title = payload.message.strip()[:80] or "New conversation"
            conversation = await conversation_repository.create(project_id, title)

        await conversation_repository.add_message(conversation.id, "user", payload.message)

        async def stream():
            assistant_content: list[str] = []
            try:
                yield _event(
                    "conversation",
                    {
                        "id": str(conversation.id),
                        "project_id": str(project_id),
                        "title": conversation.title,
                    },
                )
                rag_state = await prepare_rag_context(
                    db,
                    project_id,
                    conversation.id,
                    payload.message,
                    payload.document_ids,
                )
                yield _event("sources", rag_state["sources"])

                async for token in ollama.stream_generate(rag_state["prompt"]):
                    assistant_content.append(token)
                    yield _event("token", token)

                content = "".join(assistant_content).strip()
                message = await conversation_repository.add_message(
                    conversation.id,
                    "assistant",
                    content or "I could not generate a response.",
                    {"sources": rag_state["sources"]},
                )
                yield _event("final", {"message_id": str(message.id), "content": message.content})
            except Exception as exc:
                await db.rollback()
                yield _event("error", {"detail": str(exc)})
            finally:
                await ollama.close()

        return StreamingResponse(stream(), media_type="text/event-stream")
    except Exception:
        await ollama.close()
        raise


@router.post("/messages/{message_id}/feedback")
async def post_message_feedback(
    project_id: UUID,
    message_id: UUID,
    payload: FeedbackRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    project = await ProjectRepository(db).get_for_user(project_id, current_user.id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    repository = MessageRepository(db)
    message = await repository.get_for_project(message_id, project_id)
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    await repository.update_feedback(message, payload.rating, payload.comment)
    return {"status": "success"}
