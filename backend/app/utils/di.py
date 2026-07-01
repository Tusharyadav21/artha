from typing import AsyncIterable

from dishka import Provider, Scope, make_async_container, provide
from minio import Minio
from qdrant_client import AsyncQdrantClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.utils.database import AsyncSessionLocal
from app.utils.minio_client import minio_client
from app.utils.qdrant_client import qdrant_client

class AppProvider(Provider):
    @provide(scope=Scope.APP)
    def get_settings(self) -> Settings:
        return get_settings()

    @provide(scope=Scope.APP)
    def get_minio(self) -> Minio:
        return minio_client

    @provide(scope=Scope.APP)
    def get_qdrant(self) -> AsyncQdrantClient:
        return qdrant_client

    @provide(scope=Scope.REQUEST)
    async def get_db(self) -> AsyncIterable[AsyncSession]:
        async with AsyncSessionLocal() as session:
            yield session

def setup_di():
    provider = AppProvider()
    return make_async_container(provider)
