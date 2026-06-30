from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent, ModelRegistry, PromptTemplate, Tool, Workspace


class PlatformRepository:
    """
    Purpose:
        Handles DB operations for platform entities
        (Workspaces, Models, Prompts, Tools, Agents).
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # -----------------------------------------------------------------------
    # Workspaces
    # -----------------------------------------------------------------------
    async def get_workspace(self, workspace_id: UUID, user_id: UUID) -> Workspace | None:
        result = await self.db.execute(
            select(Workspace).where(
                Workspace.id == workspace_id, Workspace.owner_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def get_first_workspace_for_user(self, user_id: UUID) -> Workspace | None:
        result = await self.db.execute(
            select(Workspace).where(Workspace.owner_id == user_id).limit(1)
        )
        return result.scalars().first()

    async def create_workspace(self, workspace: Workspace) -> Workspace:
        self.db.add(workspace)
        await self.db.commit()
        await self.db.refresh(workspace)
        return workspace

    # -----------------------------------------------------------------------
    # Model Registry
    # -----------------------------------------------------------------------
    async def get_models(self, workspace_id: UUID) -> Sequence[ModelRegistry]:
        result = await self.db.execute(
            select(ModelRegistry).where(ModelRegistry.workspace_id == workspace_id)
        )
        return result.scalars().all()

    async def get_model(self, model_id: UUID, workspace_id: UUID) -> ModelRegistry | None:
        result = await self.db.execute(
            select(ModelRegistry).where(
                ModelRegistry.id == model_id, ModelRegistry.workspace_id == workspace_id
            )
        )
        return result.scalar_one_or_none()

    async def create_model(self, model: ModelRegistry) -> ModelRegistry:
        self.db.add(model)
        await self.db.commit()
        await self.db.refresh(model)
        return model

    async def delete_model(self, model: ModelRegistry) -> None:
        await self.db.delete(model)
        await self.db.commit()

    # -----------------------------------------------------------------------
    # Prompt Templates
    # -----------------------------------------------------------------------
    async def get_prompts(self, workspace_id: UUID) -> Sequence[PromptTemplate]:
        result = await self.db.execute(
            select(PromptTemplate).where(PromptTemplate.workspace_id == workspace_id)
        )
        return result.scalars().all()

    async def get_prompt(self, prompt_id: UUID, workspace_id: UUID) -> PromptTemplate | None:
        result = await self.db.execute(
            select(PromptTemplate).where(
                PromptTemplate.id == prompt_id,
                PromptTemplate.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_prompt(self, prompt: PromptTemplate) -> PromptTemplate:
        self.db.add(prompt)
        await self.db.commit()
        await self.db.refresh(prompt)
        return prompt

    async def delete_prompt(self, prompt: PromptTemplate) -> None:
        await self.db.delete(prompt)
        await self.db.commit()

    # -----------------------------------------------------------------------
    # Tools
    # -----------------------------------------------------------------------
    async def get_tools(self, workspace_id: UUID) -> Sequence[Tool]:
        result = await self.db.execute(
            select(Tool).where(Tool.workspace_id == workspace_id)
        )
        return result.scalars().all()

    async def get_tool(self, tool_id: UUID, workspace_id: UUID) -> Tool | None:
        result = await self.db.execute(
            select(Tool).where(
                Tool.id == tool_id, Tool.workspace_id == workspace_id
            )
        )
        return result.scalar_one_or_none()

    async def create_tool(self, tool: Tool) -> Tool:
        self.db.add(tool)
        await self.db.commit()
        await self.db.refresh(tool)
        return tool

    async def delete_tool(self, tool: Tool) -> None:
        await self.db.delete(tool)
        await self.db.commit()

    # -----------------------------------------------------------------------
    # Agents
    # -----------------------------------------------------------------------
    async def get_agents(self, workspace_id: UUID) -> Sequence[Agent]:
        result = await self.db.execute(
            select(Agent).where(Agent.workspace_id == workspace_id)
        )
        return result.scalars().all()

    async def get_agent(self, agent_id: UUID, workspace_id: UUID) -> Agent | None:
        result = await self.db.execute(
            select(Agent).where(
                Agent.id == agent_id, Agent.workspace_id == workspace_id
            )
        )
        return result.scalar_one_or_none()

    async def create_agent(self, agent: Agent) -> Agent:
        self.db.add(agent)
        await self.db.commit()
        await self.db.refresh(agent)
        return agent

    async def delete_agent(self, agent: Agent) -> None:
        await self.db.delete(agent)
        await self.db.commit()
