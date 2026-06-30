from typing import Annotated, Any, Dict, List, Sequence, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph import END, StateGraph, add_messages

from app.services.intent_classifier import intent_classifier
from app.services.planner import planner_service

class WorkflowState(TypedDict):
    """The central state of the workflow engine."""
    messages: Annotated[Sequence[BaseMessage], add_messages]
    intent: str
    plan: List[str]
    current_step: int
    context: str

def classify_intent_node(state: WorkflowState) -> Dict[str, Any]:
    query = state["messages"][-1].content
    intent = intent_classifier.classify(query)
    return {"intent": intent}

def planner_node(state: WorkflowState) -> Dict[str, Any]:
    query = state["messages"][-1].content
    plan = planner_service.generate_plan(query, context=state.get("context", ""))
    return {"plan": plan, "current_step": 0}

def route_based_on_intent(state: WorkflowState) -> str:
    if state["intent"] == "multi_step_workflow":
        return "planner"
    # Additional fast-paths (e.g. 'chat' bypasses planner)
    return END

# Build the workflow graph
workflow = StateGraph(WorkflowState)

workflow.add_node("classify", classify_intent_node)
workflow.add_node("planner", planner_node)

workflow.set_entry_point("classify")

workflow.add_conditional_edges("classify", route_based_on_intent, ["planner", END])
workflow.add_edge("planner", END)

# Compile the graph
workflow_engine = workflow.compile()
