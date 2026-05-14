from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


from src.domain.models import DocumentStatus

class DocumentRead(BaseModel):
    id: UUID
    filename: str
    mime_type: str | None
    file_size: int
    content_sha256: str
    status: DocumentStatus
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    processed_at: datetime | None

    model_config = {"from_attributes": True}


class PaginatedDocuments(BaseModel):
    items: list[DocumentRead]
    total: int
