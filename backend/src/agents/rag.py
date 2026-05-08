from typing import TypedDict
from uuid import UUID

from langgraph.graph import END, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

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


def build_rag_graph(db: AsyncSession):
    async def retrieve(state: RagState) -> RagState:
        query_embedding = await OllamaClient().embed(state["question"])
        rows = await DocumentRepository(db).search_chunks(state["project_id"], query_embedding)
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

    async def compose_prompt(state: RagState) -> RagState:
        if state["sources"]:
            context = "\n\n".join(
                f"[{index}] {source['filename']}\n{source['content']}"
                for index, source in enumerate(state["sources"], start=1)
            )
        else:
            context = "No project documents matched the question."

        prompt = (
            "You are a careful local-first RAG assistant. Answer using the supplied project "
            "context when it is relevant. Cite sources inline using [1], [2], etc. If the "
            "context is insufficient, say what is missing and answer from general reasoning only "
            "when useful.\n\n"
            f"Project context:\n{context}\n\n"
            f"User question:\n{state['question']}\n\n"
            "Assistant answer:"
        )
        return {**state, "prompt": prompt}

    graph = StateGraph(RagState)
    graph.add_node("retrieve", retrieve)
    graph.add_node("compose_prompt", compose_prompt)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "compose_prompt")
    graph.add_edge("compose_prompt", END)
    return graph.compile()


async def prepare_rag_context(
    db: AsyncSession,
    project_id: UUID,
    conversation_id: UUID,
    question: str,
) -> RagState:
    graph = build_rag_graph(db)
    result = await graph.ainvoke(
        {
            "project_id": project_id,
            "question": question,
            "sources": [],
            "prompt": "",
        },
        config={"configurable": {"thread_id": str(conversation_id)}},
    )
    return result
