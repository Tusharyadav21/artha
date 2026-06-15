import asyncio
import math
import re
from logging import getLogger

from sentence_transformers import CrossEncoder

from src.core.config import get_settings

logger = getLogger(__name__)

_lock: asyncio.Lock = asyncio.Lock()
_model: CrossEncoder | None = None


def _sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


async def _ensure_model():
    global _model
    if _model is None:
        async with _lock:
            if _model is None:
                settings = get_settings()
                logger.info(
                    "Loading reranker model: %s (device=%s)",
                    settings.reranker_model,
                    settings.reranker_device,
                )
                _model = CrossEncoder(settings.reranker_model, device=settings.reranker_device)


class Reranker:
    async def rerank(
        self, query: str, documents: list[str], top_k: int = 5
    ) -> list[tuple[int, float]]:
        await _ensure_model()
        if not documents:
            return []
        pairs = [[query, doc] for doc in documents]
        logits = _model.predict(pairs)  # type: ignore[union-attr]
        results = [(i, _sigmoid(float(score))) for i, score in enumerate(logits)]
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    async def compress_chunk(self, query: str, chunk: str, max_sentences: int = 3) -> str:
        await _ensure_model()
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", chunk) if len(s.strip()) > 20]
        if len(sentences) <= max_sentences:
            return chunk
        pairs = [[query, s] for s in sentences]
        scores = _model.predict(pairs)  # type: ignore[union-attr]
        top_indices = sorted(
            range(len(sentences)), key=lambda i: scores[i], reverse=True
        )[:max_sentences]
        top_indices.sort()
        return " ".join(sentences[i] for i in top_indices)
