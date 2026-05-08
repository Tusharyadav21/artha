from typing import TypedDict
from uuid import UUID

from langgraph.graph import END, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Project
from src.repositories.conversations import ConversationRepository
from src.repositories.documents import DocumentRepository
from src.services.ollama import OllamaClient


class Source(TypedDict):
    document_id: str
    filename: str
    content: str
    score: float


class RagState(TypedDict):
    project_id: UUID
    question: str
    sources: list[Source]
    prompt: str
    history: list[dict]
    search_query: str
    document_ids: list[UUID] | None
    system_prompt: str | None


DEFAULT_SYSTEM_PROMPT = (
    "You are a careful local-first RAG assistant. Answer using the supplied "
    "project context when it is relevant. Cite sources inline using [1], [2], "
    "etc. If the context is insufficient, say what is missing and answer from "
    "general reasoning only when useful."
)


def _format_history(history: list[dict[str, str]], capitalize_roles: bool = False) -> str:
    if capitalize_roles:
        return "\n".join(
            f"{message['role'].capitalize()}: {message['content']}" for message in history
        )
    return "\n".join(f"{message['role']}: {message['content']}" for message in history)


def build_rag_graph(db: AsyncSession):
    async def rewrite_query(state: RagState) -> RagState:
        if not state.get("history"):
            return {**state, "search_query": state["question"]}

        history_str = _format_history(state["history"])
        prompt = (
            "Given the following conversation history and a follow-up question, "
            "rewrite the follow-up question to be a standalone query that "
            "contains all necessary context for a document retrieval search. "
            "Output ONLY the rewritten standalone query, with no introductions or extra text.\n\n"
            f"Conversation History:\n{history_str}\n\n"
            f"Follow-up Question:\n{state['question']}\n\n"
            "Standalone Query:"
        )
        try:
            standalone = await OllamaClient().generate(prompt)
            search_query = standalone.strip() or state["question"]
        except Exception:
            search_query = state["question"]
        return {**state, "search_query": search_query}

    async def retrieve(state: RagState) -> RagState:
        query_embedding = await OllamaClient().embed(state["search_query"])
        rows = await DocumentRepository(db).search_chunks(
            state["project_id"],
            query_embedding,
            document_ids=state.get("document_ids"),
        )
        sources: list[Source] = [
            {
                "document_id": str(document.id),
                "filename": document.filename,
                "content": chunk.content,
                "score": score,
            }
            for chunk, document, score in rows
        ]
        return {**state, "sources": sources}

    def compose_prompt(state: RagState) -> RagState:
        if state["sources"]:
            context = "\n\n".join(
                f"[{index}] {source['filename']}\n{source['content']}"
                for index, source in enumerate(state["sources"], start=1)
            )
        else:
            context = "No project documents matched the question."

        system_preamble = state.get("system_prompt") or DEFAULT_SYSTEM_PROMPT

        history_context = ""
        if state.get("history"):
            history_str = _format_history(state["history"], capitalize_roles=True)
            history_context = f"Recent conversation history:\n{history_str}\n\n"

        prompt = (
            f"{system_preamble}\n\n"
            f"Project context:\n{context}\n\n"
            f"{history_context}"
            f"User question:\n{state['question']}\n\n"
            "Assistant answer:"
        )
        return {**state, "prompt": prompt}

    graph = StateGraph(RagState)
    graph.add_node("rewrite_query", rewrite_query)
    graph.add_node("retrieve", retrieve)
    graph.add_node("compose_prompt", compose_prompt)
    graph.set_entry_point("rewrite_query")
    graph.add_edge("rewrite_query", "retrieve")
    graph.add_edge("retrieve", "compose_prompt")
    graph.add_edge("compose_prompt", END)
    return graph.compile()


async def prepare_rag_context(
    db: AsyncSession,
    project_id: UUID,
    conversation_id: UUID,
    question: str,
    document_ids: list[UUID] | None = None,
) -> RagState:
    project = await db.get(Project, project_id)
    system_prompt = project.system_prompt if project else None

    conversation = await ConversationRepository(db).get_for_project(conversation_id, project_id)
    history = []
    if conversation and conversation.messages:
        for m in conversation.messages[:-1]:
            history.append({"role": m.role, "content": m.content})

    graph = build_rag_graph(db)
    result = await graph.ainvoke(
        {
            "project_id": project_id,
            "question": question,
            "sources": [],
            "prompt": "",
            "history": history,
            "search_query": question,
            "document_ids": document_ids,
            "system_prompt": system_prompt,
        },
        config={"configurable": {"thread_id": str(conversation_id)}},
    )
    return result
