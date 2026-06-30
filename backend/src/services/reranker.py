import math
import re
from logging import getLogger

from sentence_transformers import CrossEncoder

from src.core.config import get_settings

logger = getLogger(__name__)


def _sigmoid(x: float) -> float:
    """
    Purpose:
        Map raw logits to a (0, 1) probability range.

    Inputs:
        x (float): Raw logit score.

    Outputs:
        float: Sigmoid value in range (0, 1).
    """
    # Clamp to avoid math.exp overflow on extreme logits
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


class Reranker:
    """
    Purpose:
        Cross-encoder based document reranker to refine semantic search results.

    Responsibilities:
        - Load a CrossEncoder model for high-precision relevance scoring.
        - Score pairs of (query, document) and rank them.
        - Extract most relevant sentences from chunks to reduce LLM context.

    Dependencies:
        - sentence-transformers (CrossEncoder).
        - Global settings for model name.

    Architectural constraints:
        - Implemented as a Singleton to avoid reloading heavy model weights.
        - Scores are normalized via sigmoid for model-agnostic thresholding.
    """
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Reranker, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._model is None:
            model_name = get_settings().reranker_model
            logger.info(f"Loading reranker model: {model_name}")
            self._model = CrossEncoder(model_name, device="cpu")

    def rerank(self, query: str, documents: list[str], top_k: int = 5) -> list[tuple[int, float]]:
        """
        Purpose:
            Rerank a set of documents by relevance to a query.

        Responsibilities:
            - Generate pairs of (query, doc).
            - Predict logits using the cross-encoder.
            - Map logits to probabilities via sigmoid.

        Inputs:
            query (str): The user query.
            documents (list[str]): List of document texts to rerank.
            top_k (int): Number of top results to return.

        Outputs:
            list[tuple[int, float]]: Sorted list of (original_index, relevance_score).

        Execution flow:
            1. Create (query, doc) pairs for all documents.
            2. Run model.predict() to get raw logits.
            3. Apply sigmoid to each logit.
            4. Sort results by score descending and return top_k.
        """
        if not documents:
            return []
        pairs = [[query, doc] for doc in documents]
        logits = self._model.predict(pairs)
        results = [(i, _sigmoid(float(score))) for i, score in enumerate(logits)]
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def compress_chunk(self, query: str, chunk: str, max_sentences: int = 3) -> str:
        """
        Purpose:
            Extract most relevant sentences from a chunk to reduce LLM context noise.

        Responsibilities:
            - Split chunk into sentences.
            - Score each sentence against the query using the cross-encoder.
            - Select top-N sentences and restore their original order.

        Inputs:
            query (str): The user query.
            chunk (str): Text of the chunk to compress.
            max_sentences (int): Maximum number of sentences to keep.

        Outputs:
            str: Compressed chunk text.

        Execution flow:
            1. Split chunk into sentences > 20 chars.
            2. If sentence count <= max_sentences, return full chunk.
            3. Score all sentences against query.
            4. Identify top-N indices by score.
            5. Sort indices to maintain original flow.
            6. Join selected sentences.
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
