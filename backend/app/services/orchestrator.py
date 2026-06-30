import json
from typing import Annotated, Any, Dict, List, Sequence, TypedDict

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_ollama import ChatOllama
from langgraph.graph import END, StateGraph, add_messages
from langgraph.prebuilt import ToolNode

from app.config import get_settings
from app.services.agent_registry import agent_registry
from app.services.tool_registry import tool_registry

settings = get_settings()

class AgentState(TypedDict):
    """The state of the agentic workflow."""
    messages: Annotated[Sequence[BaseMessage], add_messages]
    intent: str
    plan: List[str]
    current_step: int
    active_agent: str

def classify_intent(state: AgentState) -> Dict[str, Any]:
    """Classifies the user's intent to route to the correct agent/plan."""
    last_message = state["messages"][-1].content
    
    # In a real app, use a cheap LLM call or heuristics to classify intent.
    # For now, we route everything to the planner.
    return {"intent": "general"}

def run_planner(state: AgentState) -> Dict[str, Any]:
    """Uses the planner agent to generate a step-by-step plan."""
    planner_config = agent_registry.get_agent("planner")
    if not planner_config:
        raise ValueError("Planner agent not configured.")
        
    llm = ChatOllama(
        model=planner_config.model_name,
        base_url=settings.ollama_base_url
    )
    
    system_prompt = planner_config.system_prompt
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend([{"role": m.type, "content": m.content} for m in state["messages"]])
    
    response = llm.invoke(messages)
    
    # Very basic plan parsing, in reality you'd enforce JSON output from the LLM.
    plan = [step.strip() for step in response.content.split("\n") if step.strip()]
    
    return {"plan": plan, "active_agent": "researcher", "current_step": 0}

def execute_agent(state: AgentState) -> Dict[str, Any]:
    """Executes the active agent to fulfill the current step in the plan."""
    agent_name = state.get("active_agent", "researcher")
    agent_config = agent_registry.get_agent(agent_name)
    
    if not agent_config:
        raise ValueError(f"Agent {agent_name} not found.")
        
    tools = [tool_registry.get_tool(t) for t in agent_config.allowed_tools]
    tools = [t for t in tools if t is not None]
    
    llm = ChatOllama(
        model=agent_config.model_name,
        base_url=settings.ollama_base_url
    ).bind_tools(tools)
    
    system_msg = [{"role": "system", "content": agent_config.system_prompt}]
    
    # Execute step (in a complete implementation, this would loop over steps)
    response = llm.invoke(system_msg + list(state["messages"]))
    
    return {"messages": [response]}

# The ToolNode will automatically execute any tools returned by the LLM
tool_node = ToolNode(tool_registry.get_enabled_tools())

def should_continue(state: AgentState) -> str:
    """Determine whether to use tools or end."""
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END

# Build the workflow graph
workflow = StateGraph(AgentState)

workflow.add_node("classify", classify_intent)
workflow.add_node("planner", run_planner)
workflow.add_node("agent", execute_agent)
workflow.add_node("tools", tool_node)

workflow.set_entry_point("classify")

workflow.add_edge("classify", "planner")
workflow.add_edge("planner", "agent")
workflow.add_conditional_edges("agent", should_continue, ["tools", END])
workflow.add_edge("tools", "agent")

# Compile the graph
orchestrator = workflow.compile()
