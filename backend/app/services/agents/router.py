import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.services.agents.interfaces import AgentRouter

logger = logging.getLogger(__name__)


class RegistryRouter(AgentRouter):
    """
    Selects an Agent by matching query keywords against routing_description.

    This is a lightweight keyword-scoring router (not embedding-based).
    Agents with active status and a non-empty routing_description are scored
    by how many of their keywords appear in the user query (case-insensitive).
    The highest-scoring agent wins. Ties fall back to the first match.
    If no agent has a routing_description, returns the first active agent.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def select_agent(self, query: str, workspace_id: UUID) -> Agent | None:
        logger.info("Routing query for workspace %s: %s", workspace_id, query[:80])

        result = await self.db.execute(
            select(Agent).where(
                Agent.workspace_id == workspace_id,
                Agent.is_active,
            )
        )
        agents: list[Agent] = list(result.scalars().all())
        if not agents:
            return None

        query_lower = query.lower()
        query_tokens = set(query_lower.split())

        # Score each agent by keyword overlap with query
        best_agent: Agent | None = None
        best_score = -1

        for agent in agents:
            description = (agent.routing_description or "").lower()
            desc_tokens = set(description.split())
            score = len(query_tokens & desc_tokens)

            if score > best_score:
                best_score = score
                best_agent = agent

        # Fallback: return first active agent if no routing_description match
        if best_score <= 0:
            return agents[0]

        logger.info("Routed to Agent: %s (score=%d)", best_agent.name, best_score)
        return best_agent
