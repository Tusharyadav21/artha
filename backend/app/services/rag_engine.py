from typing import List, Dict, Any
from app.services.model_registry import model_registry
from langchain_ollama import OllamaEmbeddings
from app.config import get_settings

settings = get_settings()

class RagEngine:
    """Handles Chunking, Embedding, Retrieval, Re-ranking, and Context Building."""
    
    def __init__(self):
        embed_config = model_registry.get_model("embedding")
        self.embed_model_name = embed_config.model_name if embed_config else settings.ollama_model_embed
        self.embeddings = OllamaEmbeddings(
            model=self.embed_model_name,
            base_url=settings.ollama_base_url
        )

    async def retrieve(self, query: str, collection_name: str = "artha_docs", limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch raw chunks from vector store."""
        # This would call QdrantClient
        # query_vector = await self.embeddings.aembed_query(query)
        # return qdrant_client.search(...)
        return [{"content": "Mock retrieved document", "score": 0.8}]

    async def rerank(self, query: str, documents: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        """Re-rank retrieved documents using a cross-encoder or reranker model."""
        # Mock reranking: simply slice the top_k
        return sorted(documents, key=lambda x: x.get("score", 0), reverse=True)[:top_k]

    async def build_context(self, query: str) -> str:
        """End-to-end pipeline to build a context string for LLM."""
        docs = await self.retrieve(query)
        reranked_docs = await self.rerank(query, docs)
        
        context = "\n\n".join([doc["content"] for doc in reranked_docs])
        return context

rag_engine = RagEngine()
