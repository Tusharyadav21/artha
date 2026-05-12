import re
from logging import getLogger

from sentence_transformers import CrossEncoder

logger = getLogger(__name__)


class Reranker:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Reranker, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._model is None:
            model_name = "cross-encoder/ms-marco-MiniLM-L-6-v2"
            logger.info(f"Loading reranker model: {model_name}")
            self._model = CrossEncoder(model_name, device="cpu")

    def rerank(self, query: str, documents: list[str], top_k: int = 5) -> list[tuple[int, float]]:
        """Rerank documents by relevance. Returns (original_index, score) pairs sorted by score desc."""
        if not documents:
            return []
        pairs = [[query, doc] for doc in documents]
        scores = self._model.predict(pairs)
        results = list(enumerate(scores))
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def compress_chunk(self, query: str, chunk: str, max_sentences: int = 3) -> str:
        """
        Extract the most query-relevant sentences from a chunk.
        Reduces context tokens while keeping the signal the LLM needs.
        Falls back to the full chunk when it has few sentences.
        """
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", chunk) if len(s.strip()) > 20]
        if len(sentences) <= max_sentences:
            return chunk
        pairs = [[query, s] for s in sentences]
        scores = self._model.predict(pairs)
        # Pick top-N by score, then restore original order for coherent reading
        top_indices = sorted(
            range(len(sentences)), key=lambda i: scores[i], reverse=True
        )[:max_sentences]
        top_indices.sort()
        return " ".join(sentences[i] for i in top_indices)
