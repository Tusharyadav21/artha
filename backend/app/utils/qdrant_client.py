from qdrant_client import AsyncQdrantClient, models
from app.config import get_settings

settings = get_settings()

qdrant_client = AsyncQdrantClient(url=settings.qdrant_url)

async def ensure_collection_exists(collection_name: str, vector_size: int = 1024):
    """Ensure a Qdrant collection exists on startup."""
    try:
        collections = await qdrant_client.get_collections()
        if not any(c.name == collection_name for c in collections.collections):
            await qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE
                )
            )
    except Exception as err:
        print(f"Error checking/creating Qdrant collection: {err}")
