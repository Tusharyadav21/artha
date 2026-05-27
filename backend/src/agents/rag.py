from typing import TypedDict
from uuid import UUID

from langgraph.graph import END, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.domain.models import Project
from src.repositories.conversations import ConversationRepository
from src.repositories.documents import DocumentRepository
from src.services.ollama import OllamaClient
from src.services.reranker import Reranker

# Chunk_limit threshold at or above which HyDE expansion is attempted
_HYDE_COMPLEXITY_THRESHOLD = 6

# Summarize old history once conversation exceeds this many messages
_HISTORY_SUMMARIZE_AT = 10
# How many recent messages to always keep verbatim
_HISTORY_KEEP_RECENT = 6
# Reranker emits sigmoid-normalised scores in (0, 1). Below this, the best
# chunk is treated as essentially irrelevant and the prompt falls back to a
# "no sufficient context" instruction. Tuned conservatively so weak matches
# still reach the LLM as supporting context.
_RELEVANCE_THRESHOLD = 0.05

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
    model_name: str | None
    num_ctx: int | None
    num_predict: int | None
    hyde_text: str | None


DEFAULT_SYSTEM_PROMPT = (
    "You are a careful local-first RAG assistant. Answer using the supplied "
    "project context when it is relevant. Cite sources inline using [1], [2], "
    "etc. If the context is insufficient, say what is missing and answer from "
    "general reasoning only when useful."
)


def _format_history(history: list[dict[str, str]], capitalize_roles: bool = False) -> str:
    """
    Purpose:
        Formats a list of message dictionaries into a readable string for LLM context.

    Args:
        history (list[dict[str, str]]):
            List of messages, each containing 'role' and 'content'.

        capitalize_roles (bool, optional):
            Whether to capitalize the role name (e.g., 'User' vs 'user'). Defaults to False.

    Returns:
        str:
            A newline-separated string of role: content pairs.
    """
    if capitalize_roles:
        return "\n".join(
            f"{message['role'].capitalize()}: {message['content']}" for message in history
        )
    return "\n".join(f"{message['role']}: {message['content']}" for message in history)


def _classify_query_complexity(query: str) -> int:
    """
    Purpose:
        Determines the appropriate number of retrieved chunks based on query complexity.

    Args:
        query (str):
            The standalone search query.

    Returns:
        int:
            A chunk limit (3, 5, or 6) based on query length and keywords.

    Flow:
        1. Split query into lowercase words.
        2. Return 3 for short queries without complex keywords.
        3. Return 6 for very long queries or those containing complex keywords.
        4. Return 5 as a default for medium complexity.
    """
    words = query.lower().split()
    if len(words) <= 8 and not _COMPLEX_KEYWORDS.intersection(words):
        return 3
    if len(words) > 20 or _COMPLEX_KEYWORDS.intersection(words):
        return 6
    return 5


async def _summarize_history(messages: list[dict]) -> str:
    """
    Purpose:
        Compresses long conversation history into a concise summary using the LLM.

    Args:
        messages (list[dict]):
            The sequence of messages to summarize.

    Returns:
        str:
            A 2-3 sentence summary of the conversation.

    Raises:
        None (catches exceptions and falls back to raw text truncation).

    Flow:
        1. Format message history into a human-readable string.
        2. Construct a summarization prompt.
        3. Call OllamaClient to generate the summary.
        4. Return the stripped result or a truncated fallback on failure.
    """
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
    """
    Purpose:
        Constructs the LangGraph state machine for the RAG pipeline.

    Responsibilities:
        - Define the RagState schema
        - Implement nodes for query rewriting, routing, HyDE, retrieval, reranking, and prompt composition
        - Define the execution flow (edges) between nodes

    Args:
        db (AsyncSession):
            Database session for repository access within nodes.

    Returns:
        CompiledGraph:
            The compiled LangGraph state machine.

    Flow:
        1. Define async node functions (rewrite_query, route_query, etc.).
        2. Initialize StateGraph with RagState.
        3. Add nodes and set the entry point.
        4. Define sequential edges from rewrite -> route -> hyde -> retrieve -> rerank -> quality_gate -> compress -> compose.
        5. Compile and return the graph.
    """
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
            standalone = await OllamaClient().generate(
                prompt,
                model_name=state.get("model_name"),
                num_ctx=state.get("num_ctx"),
                num_predict=state.get("num_predict"),
            )
            search_query = standalone.strip() or state["question"]
        except Exception:
            search_query = state["question"]
        return {**state, "search_query": search_query}

    async def route_query(state: RagState) -> RagState:
        chunk_limit = _classify_query_complexity(state["search_query"])
        return {**state, "chunk_limit": chunk_limit}

    async def hyde_expand(state: RagState) -> RagState:
        """Generate a hypothetical answer for complex queries to enrich the
        embedding-side retrieval signal (HyDE). Skipped for simple lookups and
        when disabled via settings."""
        from logging import getLogger
        logger = getLogger(__name__)

        if not get_settings().hyde_enabled:
            return {**state, "hyde_text": None}
        if state.get("chunk_limit", 0) < _HYDE_COMPLEXITY_THRESHOLD:
            return {**state, "hyde_text": None}

        prompt = (
            "Write a concise, plausible 2-3 sentence answer to the question below. "
            "It will be used only as a retrieval cue, so prioritise topical keywords "
            "and entity names over hedging. Do not include preambles.\n\n"
            f"Question: {state['search_query']}\n\nHypothetical answer:"
        )
        try:
            answer = await OllamaClient().generate(
                prompt,
                model_name=state.get("model_name"),
                num_ctx=state.get("num_ctx"),
                num_predict=256,
            )
            hyde_text = answer.strip() or None
        except Exception as exc:
            logger.warning(f"HyDE expansion failed, falling back to query-only: {exc}")
            hyde_text = None
        return {**state, "hyde_text": hyde_text}

    async def retrieve(state: RagState) -> RagState:
        from logging import getLogger
        logger = getLogger(__name__)

        chunk_limit = state.get("chunk_limit", 5)
        # HyDE: combine the query with a hypothetical answer for the embedding
        # signal only — keyword/trigram search keeps the original query.
        embed_text = state["search_query"]
        if hyde_text := state.get("hyde_text"):
            embed_text = f"{state['search_query']}\n\n{hyde_text}"
        query_embedding = await OllamaClient().embed(embed_text)
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
    graph.add_node("hyde_expand", hyde_expand)
    graph.add_node("retrieve", retrieve)
    graph.add_node("rerank", rerank)
    graph.add_node("quality_gate", quality_gate)
    graph.add_node("compress", compress)
    graph.add_node("compose_prompt", compose_prompt)
    graph.set_entry_point("rewrite_query")
    graph.add_edge("rewrite_query", "route_query")
    graph.add_edge("route_query", "hyde_expand")
    graph.add_edge("hyde_expand", "retrieve")
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
    model_name: str | None = None,
    num_ctx: int | None = None,
    num_predict: int | None = None,
) -> RagState:
    """
    Purpose:
        Orchestrates the RAG pipeline to generate a final prompt for the LLM.

    Responsibilities:
        - Resolve project-specific system prompt
        - Manage and summarize conversation history
        - Execute the LangGraph RAG pipeline

    Args:
        db (AsyncSession):
            Database session dependency.

        project_id (UUID):
            The ID of the target project.

        conversation_id (UUID):
            The ID of the conversation for history retrieval.

        question (str):
            The user's query.

        document_ids (list[UUID] | None, optional):
            Optional filter for specific documents to search.

        model_name (str | None, optional):
            LLM model to use for query rewriting/summarization.

        num_ctx (int | None, optional):
            Context window size for the model.

        num_predict (int | None, optional):
            Max tokens to predict.

    Returns:
        RagState:
            The final state containing the composed prompt and retrieved sources.

    Flow:
        1. Retrieve the project's system prompt.
        2. Fetch conversation messages.
        3. Summarize history if it exceeds _HISTORY_SUMMARIZE_AT.
        4. Build the RAG graph.
        5. Invoke the graph with the current state to compute the prompt.
        6. Return the resulting RagState.
    """
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
            "model_name": model_name,
            "num_ctx": num_ctx,
            "num_predict": num_predict,
            "hyde_text": None,
        },
        config={"configurable": {"thread_id": str(conversation_id)}},
    )
    return result
