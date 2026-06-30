import logging
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

logger = logging.getLogger(__name__)

class DynamicState(TypedDict, total=False):
    user_input: str
    conversation_id: str
    workspace_id: str
    output: str
    context: list[str]
    metadata: dict[str, Any]

async def node_pass_through(state: DynamicState):
    logger.info(f"pass_through node executed with state: {state}")
    return {"metadata": {"passed": True}}

async def node_llm_generate(state: DynamicState):
    logger.info("llm_generate node executed")
    # In a real system, we'd use the provided llm_client.
    # For now, just append a stub output to prove dynamic execution works.
    return {"output": "This is a dynamically generated response from the LLM node."}

# Map of available node types to their functions
NODE_TYPES = {
    "pass_through": node_pass_through,
    "llm_generate": node_llm_generate,
}

def build_dynamic_graph(workflow_definition: dict) -> StateGraph:
    """
    Constructs a LangGraph StateGraph dynamically based on a JSON definition.
    """
    logger.info(f"Building dynamic graph with definition: {workflow_definition}")
    
    graph = StateGraph(DynamicState)
    
    nodes = workflow_definition.get("nodes", [])
    for node in nodes:
        name = node.get("name")
        node_type = node.get("type")
        
        if node_type not in NODE_TYPES:
            raise ValueError(f"Unsupported node type: {node_type}")
            
        graph.add_node(name, NODE_TYPES[node_type])
        
    entry_point = workflow_definition.get("entry_point")
    if entry_point:
        graph.set_entry_point(entry_point)
        
    edges = workflow_definition.get("edges", [])
    for edge in edges:
        from_node = edge.get("from")
        to_node = edge.get("to")
        
        if to_node == "END":
            graph.add_edge(from_node, END)
        else:
            graph.add_edge(from_node, to_node)
            
    return graph.compile()
