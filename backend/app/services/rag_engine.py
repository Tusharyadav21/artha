from typing import List, Dict, Any
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import PointStruct

from app.config import get_settings
from app.services.llm_client import LiteLLMClient

settings = get_settings()

class RagEngine:
    """Handles Chunking, Embedding, Retrieval, Re-ranking, and Context Building."""
    
    def __init__(self):
        self.embed_model_name = settings.ollama_model_embed
        self.qdrant = AsyncQdrantClient(url=settings.qdrant_url)
        self.llm_client = LiteLLMClient(model=settings.ollama_model_reasoner)

    async def embed_query(self, query: str) -> list[float]:
        return await self.llm_client.embed(query, model_name=f"ollama/{self.embed_model_name}")

    async def retrieve(
        self, 
        query: str, 
        project_id: str | None = None,
        document_ids: list[str] | None = None,
        collection_name: str = "artha_docs", 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Fetch raw chunks from vector store."""
        from qdrant_client.http.models import Filter, FieldCondition, MatchValue, MatchAny
        try:
            query_vector = await self.embed_query(query)
            
            must_conditions = []
            if project_id:
                must_conditions.append(
                    FieldCondition(key="project_id", match=MatchValue(value=str(project_id)))
                )
            if document_ids:
                must_conditions.append(
                    FieldCondition(key="document_id", match=MatchAny(any=document_ids))
                )
                
            query_filter = Filter(must=must_conditions) if must_conditions else None
                
            results = await self.qdrant.query_points(
                collection_name=collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=limit
            )
            return [
                {
                    "content": hit.payload.get("content", ""),
                    "metadata": hit.payload,
                    "score": hit.score
                }
                for hit in results.points
                if hit.payload
            ]
        except Exception as e:
            import logging
            logging.error(f"Failed to retrieve from Qdrant: {e}")
            return []

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
