from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas.analytics import ProjectAnalytics, UserAnalytics
from app.models.user import User
from app.services.repositories.analytics import AnalyticsRepository
from app.utils.database import get_db
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/projects/{project_id}", response_model=ProjectAnalytics)
async def get_project_analytics(
    project_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = AnalyticsRepository(db)
    return await repo.get_project_analytics(project_id)


@router.get("/user", response_model=UserAnalytics)
async def get_user_analytics(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = AnalyticsRepository(db)
    return await repo.get_user_analytics(current_user.id)
