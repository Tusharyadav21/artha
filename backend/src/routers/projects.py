from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.core.database import get_db
from src.domain.models import User
from src.repositories.projects import ProjectRepository
from src.schemas.projects import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ProjectRead]:
    """
    Purpose:
        Retrieves all projects associated with the authenticated user.

    Args:
        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        list:
            A list of ProjectRead schemas for the user's projects.

    Flow:
        1. Call ProjectRepository to fetch all projects owned by the user.
        2. Return the resulting list.
    """
    return await ProjectRepository(db).list_for_user(current_user.id)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectRead:
    """
    Purpose:
        Creates a new project for the authenticated user.

    Responsibilities:
        - Create project record with specified name and system prompt
        - Associate project with the current user

    Args:
        payload (ProjectCreate):
            Request body containing project name and optional system prompt.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        ProjectRead:
            The created project record.

    Side Effects:
        - Inserts a new record into the projects table.

    Flow:
        1. Call ProjectRepository to create a new project associated with the user.
        2. Return the newly created project.
    """
    return await ProjectRepository(db).create(current_user.id, payload.name, payload.system_prompt)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectRead:
    """
    Purpose:
        Updates metadata or configuration for a specific project.

    Responsibilities:
        - Verify user has access to the project
        - Apply partial updates to the project record

    Args:
        project_id (UUID):
            The ID of the project to update.

        payload (ProjectUpdate):
            Request body containing fields to update (e.g., name, system_prompt).

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        ProjectRead:
            The updated project record.

    Raises:
        HTTPException:
            404 Not Found if the project does not exist or is not owned by the user.

    Side Effects:
        - Updates the project record in the database.

    Flow:
        1. Retrieve project for the user via ProjectRepository.
        2. Raise 404 if project not found.
        3. Dump the payload to identify set fields.
        4. Return existing project if no updates are provided.
        5. Apply updates via repository and return result.
    """
    repository = ProjectRepository(db)
    project = await repository.get_for_user(project_id, current_user.id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return project
    return await repository.update(project, **updates)



@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """
    Purpose:
        Permanently deletes a project and its associated resources.

    Responsibilities:
        - Verify user has access to the project
        - Remove project record from database

    Args:
        project_id (UUID):
            The ID of the project to delete.

        current_user (Annotated[User, Depends(get_current_user)]):
            The authenticated user.

        db (Annotated[AsyncSession, Depends(get_db)]):
            Database session dependency.

    Returns:
        None

    Raises:
        HTTPException:
            404 Not Found if the project does not exist or is not owned by the user.

    Side Effects:
        - Deletes the project record from the projects table.

    Flow:
        1. Retrieve project for the user via ProjectRepository.
        2. Raise 404 if project not found.
        3. Call repository delete method to remove the project.
    """
    repository = ProjectRepository(db)
    project = await repository.get_for_user(project_id, current_user.id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await repository.delete(project)
