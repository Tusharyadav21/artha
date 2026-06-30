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

Pattern: module-level singletons for expensive clients (OllamaClient, Reranker) wrapped in `_get_*()` with `asyncio.Lock` double-checked locking.

---

## 2. RAG Pipeline (`agents/rag.py`)

### Graph Topology

```
analyze_query → retrieve (RRF) → rerank (cross-encoder) → quality_gate
                                                              ├─ pass → compress → compose_prompt → generate
                                                              └─ fail + HyDE eligible → hyde_expand → retrieve (retry)
```

### Entry Points
- `prepare_rag_context(state)` — retrieval + prompt composition (non-streaming, returns structured context)
- `stream_rag_response(state)` — streaming generation from Ollama

### Nodes

| Node | Responsibility |
|---|---|
| `analyze_query` | Classify intent (question, command, chit-chat); detect language |
| `retrieve` | Embed question → hybrid RRF search (cosine + trigram + BM25) → top-20 candidates |
| `rerank` | Cross-encoder re-scores top-20; selects top-3 |
| `quality_gate` | Threshold check (`relevance_threshold=0.05`); routes to HyDE or fallback |
| `hyde_expand` | Generate hypothetical document via LLM → re-embed → re-retrieve |
| `compress` | Sentence-level extraction from matched chunks for context window efficiency |
| `compose_prompt` | Format cited context `[1]..[N]`, inject conversation history, system prompt |
| `generate` | Stream tokens from Ollama via `stream_generate` |

### State Fields
- `question: str` — user input
- `conversation_id: UUID` — for history injection
- `project_id: UUID` — document scope for retrieval
- `sources: list[DocumentChunkRead]` — retrieved + reranked chunks
- `prompt: str` — composed LLM prompt with `[1]..[N]` citations
- `response: str` — accumulated streamed response

### Key Patterns
- **Hybrid search (RRF):** Three legs — vector cosine (1024d), trigram (pg_trgm), BM25 (pg_bm25). Fused via RRF with k=60.
- **History injection:** Last N messages injected as `{"role": "...", "content": "..."}`. Summarize when `len(history) > settings.history_summarize_at`.
- **Source deduplication:** By `chunk_id` before prompt composition.
- **All thresholds** come from `core.config.settings`.

---

## 3. Ingestion Pipeline (`agents/ingestion.py`)

### Graph Topology

```
parse_document → extract_metadata → caption_images → chunk_text → embed_chunks → save_chunks
```

### Entry Point
- `ingest_document(state)` — full parsing → chunking → embedding → persistence flow

### Nodes

| Node | Responsibility |
|---|---|
| `parse_document` | Convert raw bytes to text via MarkItDown (supports PDF, DOCX, PPTX, XLSX, images, HTML, CSV, JSON, Markdown) |
| `extract_metadata` | LLM call to extract title, summary, tags, author |
| `caption_images` | Vision LLM call to generate alt-text for embedded images |
| `chunk_text` | Hierarchical sentence-packed chunking (80-word children, 320-word parents) |
| `embed_chunks` | Generate enriched embeddings: for each chunk, LLM creates 3 hypothetical questions + summary, concatenates with content, embeds via OllamaClient |
| `save_chunks` | Persist chunks via DocumentRepository (DELETE existing + INSERT new) |

### State Fields
- `document_id: UUID`
- `source_bytes: bytes`
- `parsed_text: str = ""`
- `metadata: dict = {}`
- `chunks: list[dict] = []`
- `error: str | None = None`

### Key Patterns
- **Error handling:** Each node catches exceptions and sets `state.error` — graph routes to `error_handler` node on failure.
- **Retry:** Embedding retried per-chunk with exponential backoff via `tenacity`.
- **Timeouts:** Metadata extraction has 30s timeout (`asyncio.wait_for`).
- **Semaphore:** `ingestion_semaphore_limit=3` concurrent LLM calls to avoid Ollama overload.
- **Hierarchical chunking:** `chunk_child_words=80`, `chunk_parent_words=320`. Sentences never split mid-way. Parent context injected at retrieval time when a child chunk matches.

---

## 4. Safety & Quality Gates

| Gate | Threshold | Behavior on Failure |
|---|---|---|
| Reranker relevance | `relevance_threshold=0.05` | HyDE fallback (if answerable) or "I don't know" |
| History window | `history_summarize_at=10` | Summarize middle messages, keep last N recent |
| Retrieval minimum | < 2 chunks after gate | Trigger HyDE expansion; if still insufficient → "not found" |
| Source citation | Missing chunk_id in source | Log warning, skip un-citable segment |

---

## 5. Langfuse Tracing

- All graph invocations wrapped with `langfuse_context.trace()` decorator
- Token counts and latency logged per-node
- Retrieval quality metrics (hit rate, MRR) computed in post-processing
- Available at `localhost:3001` when Docker Compose stack is running
