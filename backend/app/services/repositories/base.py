from typing import Any, Generic, TypeVar, Optional, List
from uuid import UUID

T = TypeVar("T")

class BaseRepository(Generic[T]):
    """Abstract base repository interface enforcing Dependency Inversion."""
    
    async def get(self, id: UUID) -> Optional[T]:
        raise NotImplementedError
        
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        raise NotImplementedError
        
    async def create(self, entity: T) -> T:
        raise NotImplementedError
        
    async def update(self, entity: T) -> T:
        raise NotImplementedError
        
    async def delete(self, entity: T) -> None:
        raise NotImplementedError
