from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models import Project


class ProjectRepository:
    """
    Purpose:
        Handles persistence and retrieval of Project entities.

    Responsibilities:
        - CRUD operations for projects
        - Enforce user-level project isolation
        - Manage project metadata updates

    Dependencies:
        - SQLAlchemy AsyncSession for database access

    Architectural constraints:
        - Must not contain business logic (service layer only)
        - All queries must be scoped by user_id to prevent cross-tenant access
    """
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_user(self, user_id: UUID) -> list[Project]:
        """
        Purpose:
            Retrieve all projects associated with a specific user.

        Responsibilities:
            - Filter projects by user_id
            - Sort results by creation date descending

        Inputs:
            user_id (UUID): ID of the user owning the projects.

        Outputs:
            list[Project]: List of matching project entities.

        Exceptions:
            None explicitly raised; SQLAlchemy errors may propagate.

        Side effects:
            Read-only operation.

        Execution flow:
            1. Construct select query with user_id filter and descending sort.
            2. Execute query via AsyncSession.
            3. Extract and return scalars.
        """
        result = await self.db.execute(
            select(Project).where(Project.user_id == user_id).order_by(Project.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_for_user(self, project_id: UUID, user_id: UUID) -> Project | None:
        """
        Purpose:
            Retrieve a single project while verifying user ownership.

        Responsibilities:
            - Ensure the requested project belongs to the specified user.

        Inputs:
            project_id (UUID): ID of the project to retrieve.
            user_id (UUID): ID of the user requesting access.

        Outputs:
            Project | None: The project entity if found and owned by user, else None.

        Exceptions:
            None explicitly raised.

        Side effects:
            Read-only operation.

        Execution flow:
            1. Construct select query filtering by both project_id and user_id.
            2. Execute query.
            3. Return the single result or None.
        """
        result = await self.db.execute(
            select(Project).where(Project.id == project_id, Project.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: UUID, name: str, system_prompt: str | None = None) -> Project:
        """
        Purpose:
            Persist a new project to the database.

        Responsibilities:
            - Instantiate Project model with normalized name.
            - Commit the new entity to the session.

        Inputs:
            user_id (UUID): ID of the user who owns the project.
            name (str): Name of the project.
            system_prompt (str | None): Optional custom prompt for RAG.

        Outputs:
            Project: The created project entity with database-generated ID.

        Exceptions:
            SQLAlchemy errors (e.g., unique constraint violations).

        Side effects:
            Inserts a new row into the projects table.

        Execution flow:
            1. Create Project instance, stripping whitespace from name.
            2. Add entity to session.
            3. Commit transaction.
            4. Refresh entity to load DB defaults.
            5. Return project.
        """
        project = Project(user_id=user_id, name=name.strip(), system_prompt=system_prompt)
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def update(self, project: Project, **kwargs) -> Project:
        """
        Purpose:
            Update specific attributes of an existing project.

        Responsibilities:
            - Dynamically update entity fields based on provided keyword arguments.

        Inputs:
            project (Project): The project entity to modify.
            **kwargs: Field-value pairs to update.

        Outputs:
            Project: The updated project entity.

        Exceptions:
            SQLAlchemy errors during commit.

        Side effects:
            Modifies an existing row in the projects table.

        Execution flow:
            1. Iterate over kwargs.
            2. Use setattr to update fields if they exist on the entity.
            3. Add entity back to session.
            4. Commit and refresh.
            5. Return project.
        """
        for key, value in kwargs.items():
            if hasattr(project, key):
                setattr(project, key, value)
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project


    async def delete(self, project: Project) -> None:
        """
        Purpose:
            Remove a project from the database.

        Responsibilities:
            - Delete the specified project entity.

        Inputs:
            project (Project): The entity to remove.

        Outputs:
            None.

        Exceptions:
            SQLAlchemy errors (e.g., foreign key constraints).

        Side effects:
            Deletes a row from the projects table.

        Execution flow:
            1. Call session.delete(project).
            2. Commit transaction.
        """
        await self.db.delete(project)
        await self.db.commit()
