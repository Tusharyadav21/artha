from typing import TypedDict
from uuid import UUID

from langgraph.graph import END, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Project
from src.repositories.conversations import ConversationRepository
from src.repositories.documents import DocumentRepository
from src.services.ollama import OllamaClient
from src.services.reranker import Reranker

# Summarize old history once conversation exceeds this many messages
_HISTORY_SUMMARIZE_AT = 10
# How many recent messages to always keep verbatim
_HISTORY_KEEP_RECENT = 6
# CrossEncoder logit below which retrieved docs are considered not relevant
_RELEVANCE_THRESHOLD = 0.0

_COMPLEX_KEYWORDS = frozenset({
    "compare", "contrast", "analyze", "analyse", "summarize", "summarise",
    "explain", "list", "all", "difference", "between", "versus", "vs",
    "how", "why", "relationship", "impact", "effect", "overview",
})


class Source(TypedDict):
    document_id: str
    filename: str
    content: str
    score: float
    parent_content: str | None


class RagState(TypedDict):
    project_id: UUID
    question: str
    sources: list[Source]
    prompt: str
    history: list[dict]
    search_query: str
    document_ids: list[UUID] | None
    system_prompt: str | None
    chunk_limit: int
    low_confidence: bool


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


def _classify_query_complexity(query: str) -> int:
    """Return chunk limit (3 / 5 / 6) based on how many docs the query likely needs."""
    words = query.lower().split()
    if len(words) <= 8 and not _COMPLEX_KEYWORDS.intersection(words):
        return 3
    if len(words) > 20 or _COMPLEX_KEYWORDS.intersection(words):
        return 6
    return 5


async def _summarize_history(messages: list[dict]) -> str:
    from logging import getLogger
    logger = getLogger(__name__)

    history_str = _format_history(messages, capitalize_roles=True)
    prompt = (
        "Summarize the following conversation in 2-3 sentences, capturing the key topics "
        "and context. Be concise.\n\n"
        f"{history_str}\n\nSummary:"
    )
    try:
        return (await OllamaClient().generate(prompt)).strip()
    except Exception as exc:
        logger.warning(f"History summarization failed: {exc}, using recent messages fallback")
        return history_str[-500:]


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

    async def route_query(state: RagState) -> RagState:
        chunk_limit = _classify_query_complexity(state["search_query"])
        return {**state, "chunk_limit": chunk_limit}

    async def retrieve(state: RagState) -> RagState:
        from logging import getLogger
        logger = getLogger(__name__)

        chunk_limit = state.get("chunk_limit", 5)
        query_embedding = await OllamaClient().embed(state["search_query"])
        rows = await DocumentRepository(db).search_chunks(
            state["project_id"],
            query_embedding,
            query_text=state["search_query"],
            limit=chunk_limit * 3,  # over-fetch for reranker to select from
            document_ids=state.get("document_ids"),
        )
        sources: list[Source] = []
        for chunk, document, score in rows:
            parent_content = (chunk.metadata_ or {}).get("parent_content")
            if not parent_content:
                logger.debug(f"No parent_content for chunk {chunk.id}, using child content")
            sources.append({
                "document_id": str(document.id),
                "filename": document.filename,
                "content": chunk.content,
                "score": score,
                "parent_content": parent_content,
            })
        return {**state, "sources": sources}

    async def rerank(state: RagState) -> RagState:
        if not state["sources"]:
            return state

        reranker = Reranker()
        query = state["search_query"]
        top_k = state.get("chunk_limit", 5)

        # Rerank against parent content when available — richer signal, same model
        contents = [s.get("parent_content") or s["content"] for s in state["sources"]]
        results = reranker.rerank(query, contents, top_k=top_k)

        new_sources: list[Source] = []
        for index, score in results:
            source = dict(state["sources"][index])
            source["score"] = float(score)
            new_sources.append(source)

        return {**state, "sources": new_sources}

    async def quality_gate(state: RagState) -> RagState:
        if not state["sources"]:
            return {**state, "low_confidence": True}
        best_score = state["sources"][0]["score"]
        return {**state, "low_confidence": best_score < _RELEVANCE_THRESHOLD}

    async def compress(state: RagState) -> RagState:
        if not state["sources"] or state.get("low_confidence"):
            return state

        reranker = Reranker()
        query = state["search_query"]
        compressed: list[Source] = []
        for source in state["sources"]:
            # Use parent content for compression if available (child chunk too small)
            full_text = source.get("parent_content") or source["content"]
            condensed = reranker.compress_chunk(query, full_text, max_sentences=3)
            compressed.append({**source, "content": condensed})

        return {**state, "sources": compressed}

    def compose_prompt(state: RagState) -> RagState:
        low_confidence = state.get("low_confidence", False)

        if low_confidence or not state["sources"]:
            context = (
                "No sufficiently relevant content found in project documents. "
                "Answer from general knowledge if helpful, or clearly state what's missing."
            )
        else:
            context = "\n\n".join(
                f"[{index}] {source['filename']}\n{source['content']}"
                for index, source in enumerate(state["sources"], start=1)
            )

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
    graph.add_node("route_query", route_query)
    graph.add_node("retrieve", retrieve)
    graph.add_node("rerank", rerank)
    graph.add_node("quality_gate", quality_gate)
    graph.add_node("compress", compress)
    graph.add_node("compose_prompt", compose_prompt)
    graph.set_entry_point("rewrite_query")
    graph.add_edge("rewrite_query", "route_query")
    graph.add_edge("route_query", "retrieve")
    graph.add_edge("retrieve", "rerank")
    graph.add_edge("rerank", "quality_gate")
    graph.add_edge("quality_gate", "compress")
    graph.add_edge("compress", "compose_prompt")
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
    history: list[dict] = []
    if conversation and conversation.messages:
        messages = [
            {"role": m.role, "content": m.content}
            for m in conversation.messages[:-1]
        ]
        if len(messages) > _HISTORY_SUMMARIZE_AT:
            older = messages[:-_HISTORY_KEEP_RECENT]
            recent = messages[-_HISTORY_KEEP_RECENT:]
            summary = await _summarize_history(older)
            history = [{"role": "system", "content": f"Summary: {summary}"}] + recent
        else:
            history = messages

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
            "chunk_limit": 5,
            "low_confidence": False,
        },
        config={"configurable": {"thread_id": str(conversation_id)}},
    )
    return result
