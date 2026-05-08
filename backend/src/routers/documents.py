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
from src.schemas.documents import DocumentRead
from src.services.ingestion import sha256_bytes

router = APIRouter(prefix="/api/projects/{project_id}/documents", tags=["documents"])


async def _ensure_project(db: AsyncSession, project_id: UUID, user_id: UUID) -> None:
    if await ProjectRepository(db).get_for_user(project_id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")


@router.get("", response_model=list[DocumentRead])
async def list_documents(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _ensure_project(db, project_id, current_user.id)
    return await DocumentRepository(db).list_for_project(project_id)


@router.post("", response_model=DocumentRead, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: Annotated[UploadFile, File()],
):
    await _ensure_project(db, project_id, current_user.id)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")

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
