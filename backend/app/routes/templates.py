import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import DocumentTemplate
from app.models.schemas.idp import DocumentTemplateCreate, DocumentTemplateResponse
from app.models.user import User
from app.services.repositories.projects import ProjectRepository
from app.services.repositories.templates import TemplateRepository
from app.utils.database import get_db
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/projects/{project_id}/templates", tags=["templates"])


async def _verify_project_access(project_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession):
    project_repo = ProjectRepository(db)
    project = await project_repo.get_for_user(project_id, user_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


@router.post("", response_model=DocumentTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    project_id: uuid.UUID,
    template_data: DocumentTemplateCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_project_access(project_id, current_user.id, db)

    repo = TemplateRepository(db)
    template = DocumentTemplate(
        project_id=project_id,
        name=template_data.name,
        keywords=template_data.keywords,
        schema_mapping=template_data.schema_mapping.model_dump(mode="json"),
    )
    return await repo.create_template(template)


@router.get("", response_model=list[DocumentTemplateResponse])
async def list_templates(
    project_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_project_access(project_id, current_user.id, db)
    repo = TemplateRepository(db)
    return await repo.get_templates(project_id)


@router.put("/{template_id}", response_model=DocumentTemplateResponse)
async def update_template(
    project_id: uuid.UUID,
    template_id: uuid.UUID,
    template_data: DocumentTemplateCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_project_access(project_id, current_user.id, db)
    repo = TemplateRepository(db)
    
    template = await repo.get_template(template_id, project_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    template.name = template_data.name
    template.keywords = template_data.keywords
    template.schema_mapping = template_data.schema_mapping.model_dump(mode="json")

    return await repo.update_template(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    project_id: uuid.UUID,
    template_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _verify_project_access(project_id, current_user.id, db)
    repo = TemplateRepository(db)
    
    template = await repo.get_template(template_id, project_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    await repo.delete_template(template)
