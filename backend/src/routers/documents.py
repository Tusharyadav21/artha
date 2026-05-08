from typing import Annotated
from uuid import UUID

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.core.config import get_settings
from src.core.database import get_db
from src.domain.models import User
from src.repositories.documents import DocumentRepository
from src.repositories.projects import ProjectRepository
from src.schemas.documents import DocumentRead, PaginatedDocuments
from src.services.ingestion import sha256_bytes

router = APIRouter(prefix="/api/projects/{project_id}/documents", tags=["documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit

SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "application/x-ndjson",
    "application/msword",
}

SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".doc",
    ".txt",
    ".md",
    ".csv",
    ".json",
}


async def _ensure_project(db: AsyncSession, project_id: UUID, user_id: UUID) -> None:
    if await ProjectRepository(db).get_for_user(project_id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


async def _validate_upload_file(file: UploadFile) -> None:
    """Validate uploaded file size and type."""
    content = await file.read()
    await file.seek(0)  # Reset file pointer for caller

    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")

    # Validate MIME type or extension
    normalized_mime = (file.content_type or "").lower()
    filename_lower = file.filename.lower() if file.filename else ""
    extension = f".{filename_lower.rsplit('.', 1)[-1]}" if "." in filename_lower else ""

    if (
        normalized_mime not in SUPPORTED_MIME_TYPES
        and extension not in SUPPORTED_EXTENSIONS
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Supported: PDF, DOCX, TXT, MD, CSV, JSON",
        )


@router.get("", response_model=PaginatedDocuments)
async def list_documents(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
):
    await _ensure_project(db, project_id, current_user.id)
    items, total = await DocumentRepository(db).list_for_project(
        project_id,
        skip=skip,
        limit=limit,
    )
    return PaginatedDocuments(
        items=[DocumentRead.model_validate(item) for item in items],
        total=total,
    )


@router.post("", response_model=DocumentRead, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: Annotated[UploadFile, File()],
):
    await _ensure_project(db, project_id, current_user.id)
    await _validate_upload_file(file)

    content = await file.read()
    document = await DocumentRepository(db).create(
        project_id=project_id,
        filename=file.filename or "upload",
        mime_type=file.content_type,
        source_bytes=content,
        content_sha256=sha256_bytes(content),
    )

    repository = DocumentRepository(db)
    redis = await create_pool(RedisSettings.from_dsn(get_settings().redis_url))
    try:
        job = await redis.enqueue_job("process_document", str(document.id))
        if job is None:
            await repository.set_status(
                document,
                "failed",
                error_message="Could not enqueue document processing job",
                processed=True,
            )
    finally:
        await redis.close()

    return document
