from pydantic import BaseModel
from typing import List, Optional

class AgentConfig(BaseModel):
    name: str
    description: str
    system_prompt: str
    allowed_tools: List[str]
    model_name: str

class AgentRegistry:
    """Registry for defining and fetching specialized agents."""
    
    def __init__(self):
        self._agents: dict[str, AgentConfig] = {}
        self._register_defaults()

    def register(self, agent: AgentConfig):
        self._agents[agent.name] = agent

    def get_agent(self, name: str) -> Optional[AgentConfig]:
        return self._agents.get(name)
        
    def get_all_agents(self) -> List[AgentConfig]:
        return list(self._agents.values())

    def _register_defaults(self):
        self.register(AgentConfig(
            name="planner",
            description="Analyzes intent and creates step-by-step execution plans.",
            system_prompt="You are a brilliant planner. Break down the user's request into step-by-step instructions. Do NOT execute them. Only return the plan.",
            allowed_tools=[],
            model_name="qwen2.5:7b-instruct"
        ))
        self.register(AgentConfig(
            name="researcher",
            description="Finds relevant information in the knowledge base.",
            system_prompt="You are a research agent. Use your tools to find the answers in the provided knowledge base.",
            allowed_tools=["search_qdrant"],
            model_name="qwen2.5:7b-instruct"
        ))
        
# Global agent registry
agent_registry = AgentRegistry()
