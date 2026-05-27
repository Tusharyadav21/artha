import json
import logging
import time
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.rag import prepare_rag_context
from src.auth.dependencies import get_current_user
from src.core.database import get_db
from src.core.rate_limit import limiter
from src.domain.models import User, MessageRole
from src.repositories.conversations import ConversationRepository
from src.repositories.messages import MessageRepository
from src.repositories.projects import ProjectRepository
from src.schemas.chat import ChatRequest, FeedbackRequest
from src.services.langfuse_client import get_langfuse
from src.services.ollama import OllamaClient

router = APIRouter(prefix="/api/projects/{project_id}/chat", tags=["chat"])
logger = logging.getLogger(__name__)


def _event(event: str, data: Any) -> str:
    """
    Purpose:
        Formats data into a Server-Sent Event (SSE) string.

    Args:
        event (str):
            The SSE event type (e.g., "token", "final").

        data (Any):
            The payload to be JSON-encoded.

    Returns:
        str:
            A formatted SSE event string.
    """
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@router.post("")
@limiter.limit("20/minute")
async def chat(
    request: Request,
    project_id: UUID,
    payload: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """
    Purpose:
        Handles RAG-powered chat queries using a streaming SSE response.

    Responsibilities:
        - Verify project ownership
        - Manage conversation lifecycle (create or retrieve)
        - Persist user message
        - Orchestrate RAG context retrieval and LLM generation
        - Track spans and traces via Langfuse
        - Stream tokens and sources to the client

    Args:
        request (Request):
            FastAPI request object for rate limiting.

        project_id (UUID):
            The ID of the project containing the conversation.

        payload (ChatRequest):
            Request body containing message, model, and RAG parameters.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        StreamingResponse:
            SSE stream of conversation, sources, tokens, and the final response.

    Raises:
        HTTPException:
            404 Not Found if the project or conversation is not found.

    Side Effects:
        - Adds messages to the database.
        - Creates a new conversation if none is provided.
        - Generates spans and traces in Langfuse.

    Flow:
        1. Validate project access.
        2. Resolve conversation (existing ID or new).
        3. Persist user query message.
        4. Initialize Langfuse trace.
        5. Stream response via internal `stream()` generator:
            a. Yield conversation metadata.
            b. Retrieve RAG context and yield sources.
            c. Stream tokens from Ollama and yield each token.
            d. Persist the complete assistant response to database.
            e. Yield final message metadata.
            f. Close Langfuse spans and flush trace.
        6. Handle mid-stream errors by persisting partial responses and marking traces.
    """
    target_model = payload.model
    ollama = OllamaClient()
    lf = get_langfuse()

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

        await conversation_repository.add_message(conversation.id, MessageRole.USER, payload.message)

        # ── Langfuse trace ────────────────────────────────────────────────────
        trace = None
        if lf is not None:
            try:
                trace = lf.trace(
                    name="rag-chat",
                    session_id=str(conversation.id),
                    user_id=str(current_user.id),
                    input=payload.message,
                    metadata={
                        "project_id": str(project_id),
                        "project_name": project.name,
                        "model": target_model,
                        "num_ctx": payload.num_ctx,
                        "num_predict": payload.num_predict,
                    },
                    tags=["rag", "chat"],
                )
            except Exception as lf_exc:
                logger.warning("Langfuse trace creation failed: %s", lf_exc)
        # ─────────────────────────────────────────────────────────────────────

        async def stream():
            assistant_content: list[str] = []
            rag_span = None
            generation_span = None
            t_rag_start = time.perf_counter()

            try:
                yield _event(
                    "conversation",
                    {
                        "id": str(conversation.id),
                        "project_id": str(project_id),
                        "title": conversation.title,
                    },
                )

                # ── RAG retrieval span ────────────────────────────────────────
                if trace is not None:
                    try:
                        rag_span = trace.span(
                            name="rag-retrieval",
                            input=payload.message,
                        )
                    except Exception:
                        pass
                # ──────────────────────────────────────────────────────────────

                rag_state = await prepare_rag_context(
                    db,
                    project_id,
                    conversation.id,
                    payload.message,
                    payload.document_ids,
                    model_name=target_model,
                    num_ctx=payload.num_ctx,
                    num_predict=payload.num_predict,
                )
                yield _event("sources", rag_state["sources"])

                # ── End retrieval span ────────────────────────────────────────
                if rag_span is not None:
                    try:
                        rag_span.end(
                            output={
                                "sources_count": len(rag_state["sources"]),
                                "sources": [
                                    {"filename": s.get("filename"), "score": s.get("score")}
                                    for s in rag_state["sources"]
                                ],
                            },
                            metadata={"latency_s": round(time.perf_counter() - t_rag_start, 3)},
                        )
                    except Exception:
                        pass
                # ──────────────────────────────────────────────────────────────

                # ── Generation span ───────────────────────────────────────────
                t_gen_start = time.perf_counter()
                if trace is not None:
                    try:
                        generation_span = trace.generation(
                            name="ollama-stream",
                            model=target_model or "unknown",
                            input=rag_state["prompt"],
                            model_parameters={
                                "num_ctx": payload.num_ctx,
                                "num_predict": payload.num_predict,
                            },
                        )
                    except Exception:
                        pass
                # ──────────────────────────────────────────────────────────────

                async for token in ollama.stream_generate(
                    rag_state["prompt"],
                    model_name=target_model,
                    num_ctx=payload.num_ctx,
                    num_predict=payload.num_predict,
                ):
                    assistant_content.append(token)
                    yield _event("token", token)

                content = "".join(assistant_content).strip()
                message = await conversation_repository.add_message(
                    conversation.id,
                    MessageRole.ASSISTANT,
                    content or "I could not generate a response.",
                    {"sources": rag_state["sources"]},
                )
                yield _event("final", {"message_id": str(message.id), "content": message.content})

                # ── End generation + trace ────────────────────────────────────
                if generation_span is not None:
                    try:
                        generation_span.end(
                            output=content,
                            usage={
                                "output": len(assistant_content),
                            },
                            metadata={"latency_s": round(time.perf_counter() - t_gen_start, 3)},
                        )
                    except Exception:
                        pass
                if trace is not None:
                    try:
                        trace.update(output=content)
                        lf.flush()
                    except Exception:
                        pass
                # ──────────────────────────────────────────────────────────────

            except Exception as exc:
                await db.rollback()
                # Persist whatever was already streamed so conversation history
                # survives mid-stream failures (model timeout, OOM, etc.)
                logger.exception("Stream error after %d tokens", len(assistant_content))
                if assistant_content:
                    partial = "".join(assistant_content).strip()
                    try:
                        await conversation_repository.add_message(
                            conversation.id,
                            MessageRole.ASSISTANT,
                            partial + "\n\n*[Response interrupted due to an error]*",
                            {"sources": [], "truncated": True},
                        )
                    except Exception:
                        pass  # Best-effort; don't mask the original error

                # ── Mark trace as errored ─────────────────────────────────────
                for span in (generation_span, rag_span):
                    if span is not None:
                        try:
                            span.end(metadata={"error": str(exc)})
                        except Exception:
                            pass
                if trace is not None:
                    try:
                        trace.update(
                            output=f"ERROR: {exc}",
                            metadata={"error": True},
                        )
                        lf.flush()
                    except Exception:
                        pass
                # ──────────────────────────────────────────────────────────────

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
) -> dict[str, str]:
    """
    Purpose:
        Collects user feedback (rating and comment) for a specific chat message.

    Responsibilities:
        - Verify project ownership
        - Validate message existence within the project
        - Update feedback in the database
        - Log score to Langfuse

    Args:
        project_id (UUID):
            The ID of the parent project.

        message_id (UUID):
            The ID of the message being rated.

        payload (FeedbackRequest):
            Contains rating ("up"/"down") and an optional comment.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        dict:
            A success status message.

    Raises:
        HTTPException:
            404 Not Found if project or message is not found.

    Side Effects:
        - Updates the message record in the database.
        - Sends a score to Langfuse.

    Flow:
        1. Ensure project exists and user has access.
        2. Retrieve message scoped by project.
        3. Apply feedback via MessageRepository.
        4. Push the rating (1.0/0.0) to Langfuse.
    """
    project = await ProjectRepository(db).get_for_user(project_id, current_user.id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    repository = MessageRepository(db)
    message = await repository.get_for_project(message_id, project_id)
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    await repository.update_feedback(message, payload.rating, payload.comment)

    # ── Score the conversation turn in Langfuse ───────────────────────────────
    lf = get_langfuse()
    if lf is not None:
        try:
            lf.score(
                name="user-feedback",
                value=1.0 if payload.rating == "up" else 0.0,
                comment=payload.comment,
                trace_id=None,  # best-effort; Langfuse matches by session
            )
        except Exception:
            pass
    # ─────────────────────────────────────────────────────────────────────────

    return {"status": "success"}
