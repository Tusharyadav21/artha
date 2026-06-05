from typing import TypedDict
from uuid import UUID
import json
import logging

from langgraph.graph import END, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.config import get_settings
from src.domain.models import Project, UserMemory
from src.repositories.conversations import ConversationRepository
from src.repositories.documents import DocumentRepository
from src.services.llm_client import BaseLLMClient, OllamaAdapter
from src.services.ollama import OllamaClient
from src.services.reranker import Reranker

logger = logging.getLogger(__name__)

# Chunk_limit threshold at or above which HyDE expansion is attempted
_HYDE_COMPLEXITY_THRESHOLD = 6

# Summarize old history once conversation exceeds this many messages
_HISTORY_SUMMARIZE_AT = 10
# How many recent messages to always keep verbatim
_HISTORY_KEEP_RECENT = 6
# Reranker emits sigmoid-normalised scores in (0, 1). Below this, the best
# chunk is treated as essentially irrelevant and the prompt falls back to a
# "no sufficient context" instruction.
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
    graph_context: str | None
    query_entities: list[str] | None
    needs_hyde: bool | None
    hyde_run: bool | None


DEFAULT_SYSTEM_PROMPT = (
    "You are a careful local-first RAG assistant. Answer using the supplied "
    "project context when it is relevant. Cite sources inline using [1], [2], "
    "etc. If the context is insufficient, say what is missing and answer from "
    "general reasoning only when useful."
)


def _format_history(history: list[dict[str, str]], capitalize_roles: bool = False) -> str:
    """Formats a list of message dictionaries into a readable string for LLM context."""
    if capitalize_roles:
        return "\n".join(
            f"{message['role'].capitalize()}: {message['content']}" for message in history
        )
    return "\n".join(f"{message['role']}: {message['content']}" for message in history)


def _classify_query_complexity(query: str) -> int:
    """Determines the appropriate number of retrieved chunks based on query complexity."""
    words = query.lower().split()
    if len(words) <= 8 and not _COMPLEX_KEYWORDS.intersection(words):
        return 3
    if len(words) > 20 or _COMPLEX_KEYWORDS.intersection(words):
        return 6
    return 5


def _estimate_tokens(text: str) -> int:
    """Estimates token count based on standard word ratio (approx 1 token = 4 chars)."""
    return len(text) // 4


async def _summarize_history(messages: list[dict], llm_client: BaseLLMClient) -> str:
    """Compresses long conversation history into a concise summary using the LLM."""
    history_str = _format_history(messages, capitalize_roles=True)
    prompt = (
        "Summarize the following conversation in 2-3 sentences, capturing the key topics "
        "and context. Be concise.\n\n"
        f"{history_str}\n\nSummary:"
    )
    try:
        return (await llm_client.generate(prompt)).strip()
    except Exception as exc:
        logger.warning(f"History summarization failed: {exc}, using recent messages fallback")
        return history_str[-500:]


def build_rag_graph(db: AsyncSession, llm_client: BaseLLMClient):
    """Constructs the LangGraph state machine for the RAG pipeline."""

    async def analyze_query(state: RagState) -> RagState:
        """Consolidates query rewriting and entity extraction into a single parallelized LLM prompt."""
        history_str = _format_history(state.get("history") or [])
        
        # Combined analysis prompt returning JSON
        prompt = (
            "You are an expert search query analyzer. Analyze the user question and conversation history. "
            "Return a JSON object containing:\n"
            "1. 'standalone_query': If the question refers to past context (e.g. using 'it', 'they', 'the file'), "
            "rewrite it to be a standalone search query. Otherwise, return the original question.\n"
            "2. 'entities': A list of up to 5 key entities (nouns, systems, acronyms) mentioned in the question for Graph search. If none, return [].\n"
            "3. 'needs_hyde': Set to true only if the query is conceptual, comparison-based, or requires an abstract explanation.\n\n"
            f"History:\n{history_str}\n\n"
            f"User Question:\n{state['question']}\n\n"
            "Format: JSON object with keys 'standalone_query' (str), 'entities' (list of str), 'needs_hyde' (bool)."
        )

        try:
            res = await llm_client.generate(
                prompt,
                model_name=state.get("model_name"),
                num_ctx=state.get("num_ctx"),
                format="json"
            )
            data = json.loads(res)
            search_query = data.get("standalone_query") or state["question"]
            entities = data.get("entities") or []
            needs_hyde = data.get("needs_hyde", False)
        except Exception as exc:
            logger.warning(f"Consolidated query analysis failed: {exc}, falling back to defaults")
            search_query = state["question"]
            entities = []
            needs_hyde = False

        chunk_limit = _classify_query_complexity(search_query)

        return {
            **state,
            "search_query": search_query,
            "query_entities": entities,
            "needs_hyde": needs_hyde,
            "chunk_limit": chunk_limit
        }

    async def hyde_expand(state: RagState) -> RagState:
        """Generates a hypothetical answer to enrich retrieval. Triggered conditionally on failure."""
        if not get_settings().hyde_enabled:
            return {**state, "hyde_text": None, "hyde_run": True}

        prompt = (
            "Write a concise, plausible 2-3 sentence answer to the question below. "
            "It will be used only as a retrieval cue, so prioritise topical keywords. Do not include preambles.\n\n"
            f"Question: {state['search_query']}\n\nHypothetical answer:"
        )
        try:
            answer = await llm_client.generate(
                prompt,
                model_name=state.get("model_name"),
                num_ctx=state.get("num_ctx"),
                num_predict=256,
            )
            hyde_text = answer.strip() or None
        except Exception as exc:
            logger.warning(f"HyDE expansion failed: {exc}")
            hyde_text = None

        return {**state, "hyde_text": hyde_text, "hyde_run": True}

    async def retrieve(state: RagState) -> RagState:
        """Performs hybrid search on PostgreSQL using pgvector and trigrams."""
        chunk_limit = state.get("chunk_limit", 5)
        embed_text = state["search_query"]
        if hyde_text := state.get("hyde_text"):
            embed_text = f"{state['search_query']}\n\n{hyde_text}"
        
        query_embedding = await OllamaClient().embed(embed_text)
        rows = await DocumentRepository(db).search_chunks(
            state["project_id"],
            query_embedding,
            query_text=state["search_query"],
            limit=chunk_limit * 3,  # over-fetch for reranker
            document_ids=state.get("document_ids"),
        )
        sources: list[Source] = []
        for chunk, document, score in rows:
            parent_content = (chunk.metadata_ or {}).get("parent_content")
            sources.append({
                "document_id": str(document.id),
                "filename": document.filename,
                "content": chunk.content,
                "score": score,
                "parent_content": parent_content,
            })
        return {**state, "sources": sources}

    async def rerank(state: RagState) -> RagState:
        """Reranks retrieved candidates using local Cross-Encoder."""
        if not state["sources"]:
            return state

        reranker = Reranker()
        query = state["search_query"]
        top_k = state.get("chunk_limit", 5)

        contents = [s.get("parent_content") or s["content"] for s in state["sources"]]
        results = reranker.rerank(query, contents, top_k=top_k)

        new_sources: list[Source] = []
        for index, score in results:
            source = dict(state["sources"][index])
            source["score"] = float(score)
            new_sources.append(source)

        return {**state, "sources": new_sources}

    async def quality_gate(state: RagState) -> RagState:
        """Checks if retrieval matches satisfy relevance bounds."""
        if not state["sources"]:
            return {**state, "low_confidence": True}
        best_score = state["sources"][0]["score"]
        return {**state, "low_confidence": best_score < _RELEVANCE_THRESHOLD}

    async def compress(state: RagState) -> RagState:
        """Compresses parent context chunks to most relevant sentences."""
        if not state["sources"] or state.get("low_confidence"):
            return state

        reranker = Reranker()
        query = state["search_query"]
        compressed: list[Source] = []
        for source in state["sources"]:
            full_text = source.get("parent_content") or source["content"]
            condensed = reranker.compress_chunk(query, full_text, max_sentences=3)
            compressed.append({**source, "content": condensed})

        return {**state, "sources": compressed}

    def compose_prompt(state: RagState) -> RagState:
        """Assembles prompt payload with strict token budgeting limits."""
        total_ctx = state.get("num_ctx") or 8192
        predict_reserved = state.get("num_predict") or 1024
        prompt_budget = total_ctx - predict_reserved

        # 1. System Preamble Budget (Max 500 tokens)
        system_preamble = state.get("system_prompt") or DEFAULT_SYSTEM_PROMPT
        if _estimate_tokens(system_preamble) > 500:
            system_preamble = system_preamble[:2000]

        # 2. Graph Context Budget (Max 1000 tokens)
        graph_context = ""
        raw_graph = state.get("graph_context")
        if raw_graph:
            lines = raw_graph.split("\n")
            budget_graph = []
            running_tokens = 0
            for line in lines:
                line_toks = _estimate_tokens(line)
                if running_tokens + line_toks > 1000:
                    break
                budget_graph.append(line)
                running_tokens += line_toks
            if budget_graph:
                graph_context = f"\nKnowledge Graph Context:\n" + "\n".join(budget_graph) + "\n"

        # 3. Chat History Budget (Max 2000 tokens)
        history_context = ""
        raw_history = state.get("history") or []
        if raw_history:
            # Iterate backwards to keep the most recent messages under budget
            budget_history = []
            running_tokens = 0
            for msg in reversed(raw_history):
                msg_str = f"{msg['role'].capitalize()}: {msg['content']}"
                msg_toks = _estimate_tokens(msg_str)
                if running_tokens + msg_toks > 2000:
                    break
                budget_history.insert(0, msg_str)
                running_tokens += msg_toks
            if budget_history:
                history_context = "Recent conversation history:\n" + "\n".join(budget_history) + "\n\n"

        # 4. Document Context Budget (Remaining Prompt Budget)
        used_tokens = _estimate_tokens(system_preamble) + _estimate_tokens(graph_context) + _estimate_tokens(history_context) + _estimate_tokens(state["question"])
        chunk_budget = max(prompt_budget - used_tokens - 200, 1000)  # at least 1k tokens

        low_confidence = state.get("low_confidence", False)
        if low_confidence or not state["sources"]:
            context = (
                "No sufficiently relevant content found in project documents. "
                "Answer from general knowledge if helpful, or clearly state what's missing."
            )
        else:
            budget_sources = []
            running_tokens = 0
            for index, source in enumerate(state["sources"], start=1):
                chunk_str = f"[{index}] {source['filename']}\n{source['content']}"
                chunk_toks = _estimate_tokens(chunk_str)
                if running_tokens + chunk_toks > chunk_budget:
                    break
                budget_sources.append(chunk_str)
                running_tokens += chunk_toks
            context = "\n\n".join(budget_sources) if budget_sources else "No context loaded under budget."

        prompt = (
            f"{system_preamble}\n\n"
            f"Project context:\n{context}\n\n"
            f"{graph_context}\n"
            f"{history_context}"
            f"User question:\n{state['question']}\n\n"
            "Assistant answer:"
        )
        return {**state, "prompt": prompt}

    # Conditional router function after quality gate check
    def route_after_gate(state: RagState) -> str:
        # If confidence is low, we need HyDE, and we haven't run it yet, trigger correction pass
        if state.get("low_confidence") and state.get("needs_hyde") and not state.get("hyde_run"):
            logger.info("RAG Quality Gate failed. Routing to conditional HyDE correction pass.")
            return "hyde_expand"
        return "compress"

    graph = StateGraph(RagState)
    
    graph.add_node("analyze_query", analyze_query)
    graph.add_node("retrieve", retrieve)
    graph.add_node("rerank", rerank)
    graph.add_node("quality_gate", quality_gate)
    graph.add_node("hyde_expand", hyde_expand)
    graph.add_node("compress", compress)
    graph.add_node("compose_prompt", compose_prompt)
    
    graph.set_entry_point("analyze_query")
    graph.add_edge("analyze_query", "retrieve")
    graph.add_edge("retrieve", "rerank")
    graph.add_edge("rerank", "quality_gate")
    
    # Conditional edge
    graph.add_conditional_edges(
        "quality_gate",
        route_after_gate,
        {
            "hyde_expand": "hyde_expand",
            "compress": "compress"
        }
    )
    
    # Correction path (routes back to retrieve)
    graph.add_edge("hyde_expand", "retrieve")
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
    llm_client: BaseLLMClient | None = None,
) -> RagState:
    """Orchestrates the RAG pipeline to generate a final prompt for the LLM."""
    if llm_client is None:
        llm_client = OllamaAdapter()

    project = await db.get(Project, project_id)
    system_prompt = project.system_prompt if project else None

    conversation = await ConversationRepository(db).get_for_project(conversation_id, project_id)
    history: list[dict] = []
    
    # Fetch User Memories
    user_id = project.user_id if project else None
    if user_id:
        result = await db.execute(select(UserMemory).where(UserMemory.user_id == user_id))
        memories = result.scalars().all()
        if memories:
            memories_list = [m.content for m in memories]
            # Use local Reranker to filter User Memories down to top 3 semantically related items
            try:
                reranker = Reranker()
                scored = reranker.rerank(question, memories_list, top_k=3)
                relevant_memories = [memories_list[idx] for idx, _ in scored]
            except Exception as e:
                logger.warning(f"Reranking user memories failed: {e}. Falling back to default list.")
                relevant_memories = memories_list[:5]
                
            if relevant_memories:
                memory_str = "\n".join([f"- {m}" for m in relevant_memories])
                history.append({"role": "system", "content": f"Core User Memories/Preferences:\n{memory_str}"})

    if conversation and conversation.messages:
        messages = [
            {"role": m.role, "content": m.content}
            for m in conversation.messages[:-1]
        ]
        if len(messages) > _HISTORY_SUMMARIZE_AT:
            older = messages[:-_HISTORY_KEEP_RECENT]
            recent = messages[-_HISTORY_KEEP_RECENT:]
            summary = await _summarize_history(older, llm_client)
            history.append({"role": "system", "content": f"Summary: {summary}"})
            history.extend(recent)
        else:
            history.extend(messages)

    graph = build_rag_graph(db, llm_client)
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
            "graph_context": None,
            "query_entities": None,
            "needs_hyde": False,
            "hyde_run": False,
        },
        config={},
    )
    return result
