import uuid
from typing import Any

from pydantic import BaseModel


class Transaction(BaseModel):
    date: str
    description: str
    amount: float


class GenericDocumentSchema(BaseModel):
    """
    Fallback schema for unknown documents or receipts.
    Used by the LLM (Instructor/Ollama) to extract structured data.
    """

    document_type: str
    entity_name: str | None = None
    total_amount: float | None = None
    transactions: list[Transaction] = []


class BoundingBox(BaseModel):
    page: int
    bbox: tuple[float, float, float, float]


class TableArea(BaseModel):
    start_trigger: str
    end_trigger: str
    columns: list[str]
    vertical_lines: list[float]
    page_top_margin: float = 50.0
    page_bottom_margin: float = 800.0


class ExtractionTemplate(BaseModel):
    """
    Represents the schema mapping for a DocumentTemplate.
    """

    extraction_method: str  # e.g., "coordinates", "table"
    fields: dict[str, BoundingBox] = {}
    table_area: TableArea | None = None


class DocumentTemplateCreate(BaseModel):
    name: str
    keywords: list[str]
    schema_mapping: ExtractionTemplate


class DocumentTemplateResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    keywords: list[str]
    schema_mapping: dict[str, Any]

    class Config:
        from_attributes = True
