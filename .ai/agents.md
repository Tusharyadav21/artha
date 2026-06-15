# AI Agent Patterns (LangGraph)

This document defines the LangGraph agent architecture used in Artha's RAG pipeline and document ingestion.

---

## 1. LangGraph State Machine Pattern

All agent pipelines use LangGraph's `StateGraph` with a Pydantic `BaseModel` state. Each node is an `async` function that reads/writes state fields.

```python
class SomeState(BaseModel):
    question: str
    sources: list[DocumentChunk] = []
    prompt: str = ""
    response: str = ""

builder = StateGraph(SomeState)
builder.add_node("retrieve", retrieve_node)
builder.add_node("generate", generate_node)
builder.set_entry_point("retrieve")
builder.add_edge("retrieve", "generate")
graph = builder.compile()
```

---

## 2. RAG Pipeline (`agents/rag.py`)

Two entry points:
- `prepare_rag_context(state)` — retrieval + prompt composition (non-streaming)
- `stream_rag_response(state)` — streaming generation from Ollama

### Nodes
| Node | Responsibility |
|---|---|
| `retrieve` | Embed question, vector search `document_chunks`, rerank top-6 candidates |
| `compose_prompt` | Format context with cited sources `[1]..[N]`, inject conversation history |
| `generate` | Stream tokens from Ollama via `stream_generate` |

### State Fields
- `question: str` — user input
- `conversation_id: UUID` — for history injection
- `sources: list[DocumentChunkRead]` — retrieved chunks
- `prompt: str` — composed LLM prompt with citations
- `response: str` — accumulated streamed response

### Patterns
- Use **module-level singletons** for expensive clients (OllamaClient) — wrap in `_get_ollama_client()` with `asyncio.Lock`
- Conversation history is injected as `list[dict]` with `{"role": "...", "content": "..."}` format
- All thresholds (relevance, history length) come from `core.config.settings`
- Sources are deduplicated by `chunk_id` before prompt composition

---

## 3. Ingestion Pipeline (`agents/ingestion.py`)

One entry point:
- `ingest_document(state)` — full parsing → chunking → embedding flow

### Nodes
| Node | Responsibility |
|---|---|
| `parse` | Convert raw bytes to text via MarkItDown |
| `extract_metadata` | LLM call to extract title, summary, author |
| `chunk` | Hierarchical sentence-packed chunking |
| `embed` | Generate embeddings for each chunk via OllamaClient |
| `save` | Persist chunks via DocumentRepository |

### State Fields
- `document_id: UUID`
- `source_bytes: bytes`
- `parsed_text: str = ""`
- `metadata: dict = {}`
- `chunks: list[dict] = []`
- `error: str | None = None`

### Patterns
- Each node catches exceptions and sets `state.error` — the graph routes to an `error_handler` node on failure
- Embedding is retried per-chunk with exponential backoff via `tenacity`
- Metadata extraction has a 30-second timeout (`asyncio.wait_for`)
- Chunk sizes are controlled by `settings.ingestion_max_chunk_tokens`

---

## 4. Safety & Quality Gates

- **Retrieval threshold**: Skip chunks below `settings.relevance_threshold` (cosine similarity)
- **Reranking**: Cross-encoder reranks top-6 candidates; final prompt uses top-3 after reranking
- **History window**: Summarize when `len(history) > settings.history_summarize_at`; keep last `settings.history_keep_recent` messages
- **HyDE fallback**: If initial retrieval returns < 2 chunks, generate hypothetical document via LLM and re-embed

---

## 5. Langfuse Tracing

- All graph invocations are wrapped with `langfuse_context.trace()` decorator
- Token counts and latency are logged per-node
- Retrieval quality metrics (hit rate, MRR) are computed in post-processing
