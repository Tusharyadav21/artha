from typing import Annotated
from uuid import UUID

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.core.config import get_settings
from src.core.database import get_db
from src.domain.models import Document, DocumentStatus, User
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
    """
    Purpose:
        Verifies that a project exists and belongs to the requesting user.

    Args:
        db (AsyncSession):
            Database session dependency.

        project_id (UUID):
            The ID of the project to verify.

        user_id (UUID):
            The ID of the user requesting access.

    Returns:
        None

    Raises:
        HTTPException:
            404 Not Found if the project does not exist or is not owned by the user.

    Flow:
        1. Query the ProjectRepository for the specified project and user.
        2. Raise 404 if no matching project is found.
    """
    if await ProjectRepository(db).get_for_user(project_id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


async def _validate_upload_file(file: UploadFile) -> None:
    """
    Purpose:
        Validates that an uploaded file meets size and type requirements.

    Args:
        file (UploadFile):
            The file uploaded via the request.

    Returns:
        None

    Raises:
        HTTPException:
            400 Bad Request if file exceeds MAX_FILE_SIZE, is empty, or has an unsupported MIME type/extension.

    Side Effects:
        - Reads file content and resets the file pointer to the beginning.

    Flow:
        1. Read file bytes.
        2. Reset file pointer.
        3. Verify size is within limit and non-zero.
        4. Validate MIME type against SUPPORTED_MIME_TYPES.
        5. Validate file extension against SUPPORTED_EXTENSIONS.
    """
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
) -> PaginatedDocuments:
    """
    Purpose:
        Lists all documents associated with a specific project.

    Responsibilities:
        - Verify user has access to the project
        - Fetch paginated document list from repository

    Args:
        project_id (UUID):
            The ID of the project.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

        skip (int, optional):
            Number of records to skip for pagination. Defaults to 0.

        limit (int, optional):
            Maximum number of records to return. Defaults to 100.

    Returns:
        PaginatedDocuments:
            A paginated list of documents and the total count.

    Flow:
        1. Validate project ownership using _ensure_project.
        2. Call DocumentRepository to retrieve a slice of documents.
        3. Map database models to DocumentRead schemas.
        4. Return paginated response.
    """
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
    embed_model: str | None = None,
) -> Document:
    """
    Purpose:
        Uploads a document and enqueues it for background processing.

    Responsibilities:
        - Verify project ownership
        - Validate file size and type
        - Persist raw bytes to database
        - Enqueue a "process_document" job in Arq

    Args:
        project_id (UUID):
            The target project ID.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

        file (Annotated[UploadFile, File()]):
            The document file to upload.

        embed_model (str | None, optional):
            Optional override for the embedding model to use.

    Returns:
        DocumentRead:
            The created document record with an 'uploading' status.

    Raises:
        HTTPException:
            404 Not Found if project not found.
            400 Bad Request if file validation fails.

    Side Effects:
        - Creates a record in the documents table.
        - Adds a job to the Redis queue.

    Flow:
        1. Verify project ownership.
        2. Validate file content and type.
        3. Compute SHA256 hash of the content.
        4. Create a document record in the database.
        5. Connect to Redis and enqueue the processing job.
        6. Mark document as FAILED if enqueueing fails.
        7. Return the document record.
    """
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

    return document
