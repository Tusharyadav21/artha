import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent, ModelRegistry, PromptTemplate, Tool, Workspace
from app.models.schemas.platform import (
    AgentCreate,
    AgentResponse,
    ModelRegistryCreate,
    ModelRegistryResponse,
    PromptTemplateCreate,
    PromptTemplateResponse,
    ToolCreate,
    ToolResponse,
)
from app.models.user import User
from app.services.repositories.platform import PlatformRepository
from app.utils.database import get_db
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_workspace_or_403(
    workspace_id: UUID, user_id: UUID, repo: PlatformRepository
) -> Workspace:
    """Verify the workspace exists and the current user owns it."""
    ws = await repo.get_workspace(workspace_id, user_id)
    if not ws:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace not found or access denied",
        )
    return ws


# ============================================================================
# USER WORKSPACE
# ============================================================================


@router.get("/me")
async def get_my_workspace(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return the current user's default workspace (creates one if missing)."""
    repo = PlatformRepository(db)
    workspace = await repo.get_first_workspace_for_user(current_user.id)
    if not workspace:
        workspace = Workspace(
            name=f"{current_user.email.split('@')[0]}'s Workspace",
            owner_id=current_user.id,
        )
        workspace = await repo.create_workspace(workspace)

    return {
        "id": str(workspace.id),
        "name": workspace.name,
        "owner_id": str(workspace.owner_id),
        "created_at": workspace.created_at.isoformat() if workspace.created_at else None,
        "updated_at": workspace.updated_at.isoformat() if workspace.updated_at else None,
    }


# ============================================================================
# MODELS
# ============================================================================


@router.get("/{workspace_id}/models")
async def get_models(
    workspace_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    return await repo.get_models(workspace_id)


@router.post(
    "/{workspace_id}/models",
    response_model=ModelRegistryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_model(
    workspace_id: UUID,
    payload: ModelRegistryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    db_obj = ModelRegistry(**payload.model_dump(), workspace_id=workspace_id)
    return await repo.create_model(db_obj)


@router.delete("/{workspace_id}/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    workspace_id: UUID,
    model_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    db_obj = await repo.get_model(model_id, workspace_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Model not found")
    await repo.delete_model(db_obj)


# ============================================================================
# PROMPTS
# ============================================================================


@router.get("/{workspace_id}/prompts")
async def get_prompts(
    workspace_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    return await repo.get_prompts(workspace_id)


@router.post(
    "/{workspace_id}/prompts",
    response_model=PromptTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_prompt(
    workspace_id: UUID,
    payload: PromptTemplateCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    db_obj = PromptTemplate(**payload.model_dump(), workspace_id=workspace_id)
    return await repo.create_prompt(db_obj)


@router.delete("/{workspace_id}/prompts/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt(
    workspace_id: UUID,
    prompt_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    db_obj = await repo.get_prompt(prompt_id, workspace_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Prompt not found")
    await repo.delete_prompt(db_obj)


# ============================================================================
# TOOLS
# ============================================================================


@router.get("/{workspace_id}/tools")
async def get_tools(
    workspace_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    return await repo.get_tools(workspace_id)


@router.post(
    "/{workspace_id}/tools",
    response_model=ToolResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_tool(
    workspace_id: UUID,
    payload: ToolCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    db_obj = Tool(**payload.model_dump(), workspace_id=workspace_id)
    return await repo.create_tool(db_obj)


@router.delete("/{workspace_id}/tools/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool(
    workspace_id: UUID,
    tool_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    db_obj = await repo.get_tool(tool_id, workspace_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Tool not found")
    await repo.delete_tool(db_obj)


# ============================================================================
# AGENTS
# ============================================================================


@router.get("/{workspace_id}/agents")
async def get_agents(
    workspace_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    return await repo.get_agents(workspace_id)


@router.post(
    "/{workspace_id}/agents",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_agent(
    workspace_id: UUID,
    payload: AgentCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    data = payload.model_dump(exclude={"tool_ids", "prompt_ids"})
    db_obj = Agent(**data, workspace_id=workspace_id, created_by=current_user.id)
    return await repo.create_agent(db_obj)


@router.delete("/{workspace_id}/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    workspace_id: UUID,
    agent_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    repo = PlatformRepository(db)
    await _get_workspace_or_403(workspace_id, current_user.id, repo)
    db_obj = await repo.get_agent(agent_id, workspace_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Agent not found")
    await repo.delete_agent(db_obj)
