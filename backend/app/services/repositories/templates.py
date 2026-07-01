import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import DocumentTemplate


class TemplateRepository:
    """
    Purpose:
        Handles DB operations for DocumentTemplate entities.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_templates(self, project_id: uuid.UUID) -> Sequence[DocumentTemplate]:
        result = await self.db.execute(
            select(DocumentTemplate).where(DocumentTemplate.project_id == project_id)
        )
        return result.scalars().all()

    async def get_template(
        self, template_id: uuid.UUID, project_id: uuid.UUID,
    ) -> DocumentTemplate | None:
        result = await self.db.execute(
            select(DocumentTemplate).where(
                DocumentTemplate.id == template_id,
                DocumentTemplate.project_id == project_id
            )
        )
        return result.scalar_one_or_none()

    async def create_template(self, template: DocumentTemplate) -> DocumentTemplate:
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def update_template(self, template: DocumentTemplate) -> DocumentTemplate:
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def delete_template(self, template: DocumentTemplate) -> None:
        await self.db.delete(template)
        await self.db.commit()
