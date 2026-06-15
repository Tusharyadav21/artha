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
from src.domain.models import MessageRole, User
from src.repositories.conversations import ConversationRepository
from src.repositories.messages import MessageRepository
from src.repositories.projects import ProjectRepository
from src.schemas.chat import ChatRequest, FeedbackRequest
from src.services.langfuse_client import get_langfuse
from src.services.llm_factory import get_llm_for_user

router = APIRouter(prefix="/api/projects/{project_id}/chat", tags=["chat"])
logger = logging.getLogger(__name__)


def _event(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def _safe_span(trace, name: str, **kwargs):
    if trace is None:
        return None
    try:
        return trace.span(name=name, **kwargs)
    except Exception:
        return None


def _safe_generation(trace, name: str, **kwargs):
    if trace is None:
        return None
    try:
        return trace.generation(name=name, **kwargs)
    except Exception:
        return None


def _safe_end(span, **kwargs):
    if span is None:
        return
    try:
        span.end(**kwargs)
    except Exception:
        pass


def _safe_trace(trace, lf, **kwargs):
    if trace is None:
        return
    try:
        trace.update(**kwargs)
    except Exception:
        pass
    if lf:
        try:
            lf.flush()
        except Exception:
            pass


@router.post("")
@limiter.limit("20/minute")
async def chat(
    request: Request,
    project_id: UUID,
    payload: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    target_model = payload.model
    llm_client = await get_llm_for_user(current_user.id, db)
    lf = get_langfuse()

    try:
        project = await ProjectRepository(db).get_for_user(project_id, current_user.id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        conversation_repository = ConversationRepository(db)
        if payload.conversation_id:
            conversation = await conversation_repository.get_for_project(
                payload.conversation_id, project_id,
            )
            if conversation is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found",
                )
        else:
            title = payload.message.strip()[:80] or "New conversation"
            conversation = await conversation_repository.create(project_id, title)

        await conversation_repository.add_message(
            conversation.id, MessageRole.USER, payload.message,
        )

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

                rag_span = _safe_span(trace, name="rag-retrieval", input=payload.message)

                rag_state = {}
                async for chunk in prepare_rag_context(
                    db,
                    project_id,
                    conversation.id,
                    payload.message,
                    payload.document_ids,
                    model_name=target_model,
                    num_ctx=payload.num_ctx,
                    num_predict=payload.num_predict,
                    llm_client=llm_client,
                ):
                    node_name = list(chunk.keys())[0]
                    yield _event("node", node_name)
                    rag_state.update(chunk[node_name])
                yield _event("sources", rag_state["sources"])

                _safe_end(
                    rag_span,
                    output={
                        "sources_count": len(rag_state["sources"]),
                        "sources": [
                            {"filename": s.get("filename"), "score": s.get("score")}
                            for s in rag_state["sources"]
                        ],
                    },
                    metadata={"latency_s": round(time.perf_counter() - t_rag_start, 3)},
                )

                t_gen_start = time.perf_counter()
                generation_span = _safe_generation(
                    trace,
                    name="ollama-stream",
                    model=target_model or "unknown",
                    input=rag_state["prompt"],
                    model_parameters={
                        "num_ctx": payload.num_ctx,
                        "num_predict": payload.num_predict,
                    },
                )

                async for token in llm_client.stream_generate(
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

                _safe_end(
                    generation_span,
                    output=content,
                    usage={"output": len(assistant_content)},
                    metadata={"latency_s": round(time.perf_counter() - t_gen_start, 3)},
                )
                _safe_trace(trace, lf, output=content)

            except Exception as exc:
                await db.rollback()
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
                        pass

                for span in (generation_span, rag_span):
                    _safe_end(span, metadata={"error": str(exc)})
                _safe_trace(trace, lf, output=f"ERROR: {exc}", metadata={"error": True})

                yield _event("error", {"detail": str(exc)})
            finally:
                await llm_client.close()

        return StreamingResponse(stream(), media_type="text/event-stream")
    except Exception:
        await llm_client.close()
        raise


@router.post("/messages/{message_id}/feedback")
async def post_message_feedback(
    project_id: UUID,
    message_id: UUID,
    payload: FeedbackRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    project = await ProjectRepository(db).get_for_user(project_id, current_user.id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    repository = MessageRepository(db)
    message = await repository.get_for_project(message_id, project_id)
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    await repository.update_feedback(message, payload.rating, payload.comment)

    lf = get_langfuse()
    if lf is not None:
        try:
            lf.score(
                name="user-feedback",
                value=1.0 if payload.rating == "up" else 0.0,
                comment=payload.comment,
                trace_id=None,
            )
        except Exception:
            pass

    return {"status": "success"}
