from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


from src.domain.models import DocumentStatus

class DocumentRead(BaseModel):
    """
    Purpose:
        Sanitized representation of a document for API responses.

    Attributes:
        id (UUID): Unique document identifier.
        filename (str): Name of the file.
        mime_type (str | None): File MIME type.
        file_size (int): Size in bytes.
        content_sha256 (str): Content hash for deduplication.
        status (DocumentStatus): Processing status (PENDING, COMPLETED, FAILED).
        error_message (str | None): Processing error details if status is FAILED.
        created_at (datetime): Creation timestamp.
        updated_at (datetime): Last update timestamp.
        processed_at (datetime | None): Completion timestamp.
    """
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
    """
    Purpose:
        Schema for paginated lists of documents.

    Attributes:
        items (list[DocumentRead]): The slice of documents for the current page.
        total (int): Total number of documents matching the query.
    """
    items: list[DocumentRead]
    total: int
