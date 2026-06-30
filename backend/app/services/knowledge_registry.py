from qdrant_client import AsyncQdrantClient
from langchain_core.tools import tool

from app.utils.di import setup_di
from app.services.tool_registry import tool_registry

class KnowledgeRegistry:
    """Interface for routing queries to different data stores (Qdrant, SQL)."""
    
    def __init__(self, qdrant: AsyncQdrantClient):
        self.qdrant = qdrant
        
    async def search_vector_db(self, query: str, collection_name: str = "artha_docs", limit: int = 5):
        # Implementation for vector search
        # Note: in real use, we need an embedding model here to embed the query first.
        return f"Searching Qdrant for {query} (Mock Result)"

# To use this in tools, we need a way to access the DI container or global client.
# For now, we'll register a placeholder tool.

@tool
def search_qdrant(query: str) -> str:
    """Search the knowledge base for relevant documents."""
    return f"Found documents for: {query}"

tool_registry.register(search_qdrant)
