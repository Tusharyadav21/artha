from typing import Any, Callable, Dict, List
from langchain_core.tools import BaseTool, tool

class ToolRegistry:
    """Registry for managing all tools available to the agents."""
    
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._tool_status: Dict[str, bool] = {}

    def register(self, t: BaseTool, enabled_by_default: bool = True):
        self._tools[t.name] = t
        self._tool_status[t.name] = enabled_by_default

    def enable_tool(self, name: str):
        if name in self._tool_status:
            self._tool_status[name] = True
            
    def disable_tool(self, name: str):
        if name in self._tool_status:
            self._tool_status[name] = False

    def get_enabled_tools(self) -> List[BaseTool]:
        return [t for name, t in self._tools.items() if self._tool_status.get(name)]

    def get_tool(self, name: str) -> BaseTool | None:
        return self._tools.get(name)

# Global registry instance
tool_registry = ToolRegistry()

# Example Tool
@tool
def calculate(expression: str) -> str:
    """Evaluates a mathematical expression."""
    try:
        # In a real app, use a safe evaluator!
        return str(eval(expression, {"__builtins__": {}}, {}))
    except Exception as e:
        return f"Error evaluating expression: {e}"

tool_registry.register(calculate)
