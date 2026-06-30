# Backend Services

## Available Services

| Service | File | Responsibility |
|---|---|---|
| OllamaClient | `services/ollama.py` | Local LLM inference (embed, generate, stream, vision) via Ollama REST API. Retry with tenacity, timeouts configurable. |
| LiteLLMClient | `services/llm_client.py` | Cloud LLM inference for BYOK providers. Unified interface for 100+ providers. SSRF guard on URLs. |
| LLM Factory | `services/llm_factory.py` | Resolves per-user LLM provider from `user_llm_configs`; decrypts Fernet-encrypted API keys; constructs LiteLLM config. |
| Reranker | `services/reranker.py` | Cross-encoder reranking for retrieved chunks. Context compression (sentence extraction). |
| Ingestion | `services/ingestion.py` | Document parsing via MarkItDown (PDF, DOCX, images, etc.). Hierarchical chunking (80/320 words). Enriched embedding generation (3 hypothetical Qs + summary). |
| Vision | `services/vision.py` | Image captioning via Ollama vision models. Used during ingestion for embedded images. |
| IDP Parser | `services/idp_parser.py` | Intelligent Document Processing — table extraction, form field detection, structured data parsing. |

## Key Patterns

- **Async-first:** All I/O-bound methods are `async def`. CPU-bound parsing uses `asyncio.to_thread()`.
- **Singleton clients:** OllamaClient and Reranker are module-level singletons (double-checked locking with `asyncio.Lock`).
- **Tenacity retry:** LLM calls and embedding requests retry with exponential backoff.
- **Config-driven:** All model names, timeouts, and thresholds come from `core.config.settings`.
