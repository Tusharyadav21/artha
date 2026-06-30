from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from minio import Minio

from app.config import get_settings
from app.models.enums import DocumentStatus
from app.models.schemas.documents import DocumentRead, PaginatedDocuments
from app.models.user import User
from app.services.ingestion import sha256_bytes
from app.services.documents import DocumentService
from app.services.repositories.documents import DocumentRepository
from app.services.repositories.projects import ProjectRepository
from app.utils.database import get_db
from app.utils.minio_client import minio_client
from app.utils.dependencies import get_current_user

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

    # Delegate upload and processing task dispatching to DocumentService
    doc_service = DocumentService(minio_client, repository)
    document = await doc_service.upload_document(project_id, file)

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
    if not document.minio_object_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File content not available",
        )
        
    try:
        response = minio_client.get_object(
            bucket_name=get_settings().minio_bucket, 
            object_name=document.minio_object_name
        )
        content = response.read()
        response.close()
        response.release_conn()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch from storage: {e}")

    return Response(
        content=content,
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
