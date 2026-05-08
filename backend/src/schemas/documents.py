from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentRead(BaseModel):
    id: UUID
    filename: str
    mime_type: str | None
    file_size: int
    content_sha256: str
    status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    processed_at: datetime | None

    model_config = {"from_attributes": True}
