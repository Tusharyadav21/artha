from typing import Annotated
from uuid import UUID

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.core.config import get_settings
from src.core.database import get_db
from src.domain.models import DocumentStatus, User
from src.repositories.documents import DocumentRepository
from src.repositories.projects import ProjectRepository
from src.schemas.documents import DocumentRead, PaginatedDocuments
from src.services.ingestion import sha256_bytes

router = APIRouter(prefix="/api/projects/{project_id}/documents", tags=["documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024

SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.ms-powerpoint",
    "application/vnd.ms-excel",
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    "application/json",
    "application/x-ndjson",
    "image/jpeg",
    "image/png",
    "image/tiff",
}

SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".pptx", ".ppt",
    ".xlsx", ".xls", ".txt", ".md", ".csv",
    ".json", ".html", ".htm",
    ".jpg", ".jpeg", ".png", ".tiff",
}


async def _ensure_project(db: AsyncSession, project_id: UUID, user_id: UUID) -> None:
    if await ProjectRepository(db).get_for_user(project_id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


async def _validate_upload_file(file: UploadFile) -> None:
    content = await file.read()
    await file.seek(0)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")

    normalized_mime = (file.content_type or "").lower()
    filename_lower = file.filename.lower() if file.filename else ""
    extension = f".{filename_lower.rsplit('.', 1)[-1]}" if "." in filename_lower else ""

    if normalized_mime not in SUPPORTED_MIME_TYPES and extension not in SUPPORTED_EXTENSIONS:
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
) -> PaginatedDocuments:
    await _ensure_project(db, project_id, current_user.id)
    items, total = await DocumentRepository(db).list_for_project(project_id, skip=skip, limit=limit)
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
    embed_model: str | None = None,
) -> DocumentRead:
    await _ensure_project(db, project_id, current_user.id)
    await _validate_upload_file(file)

    content = await file.read()
    content_sha256 = sha256_bytes(content)

    repository = DocumentRepository(db)

    existing = await repository.get_by_sha256(project_id, content_sha256)
    if existing is not None:
        return DocumentRead.model_validate(existing)

    document = await repository.create(
        project_id=project_id,
        filename=file.filename or "upload",
        mime_type=file.content_type,
        source_bytes=content,
        content_sha256=content_sha256,
    )

    redis = await create_pool(RedisSettings.from_dsn(get_settings().redis_url))
    try:
        job = await redis.enqueue_job("process_document", str(document.id), embed_model=embed_model)
        if job is None:
            await repository.set_status(
                document,
                DocumentStatus.FAILED,
                error_message="Could not enqueue document processing job",
                processed=True,
            )
    finally:
        await redis.close()

    return DocumentRead.model_validate(document)


@router.get("/{document_id}/file")
async def get_document_file(
    project_id: UUID,
    document_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    await _ensure_project(db, project_id, current_user.id)
    repo = DocumentRepository(db)
    document = await repo.get_for_project(document_id, project_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not document.source_bytes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File content not available",
        )
    return Response(
        content=document.source_bytes,
        media_type=document.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{document.filename}"'},
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    project_id: UUID,
    document_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await _ensure_project(db, project_id, current_user.id)
    repo = DocumentRepository(db)
    document = await repo.get_for_project(document_id, project_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await repo.delete(document)
