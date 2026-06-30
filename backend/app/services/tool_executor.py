import asyncio
import logging
from typing import Any, Dict

from langchain_core.tools import BaseTool

logger = logging.getLogger(__name__)

class ToolExecutionError(Exception):
    pass

class ToolExecutor:
    """Safely executes tools with timeouts, retries, and sandboxing considerations."""
    
    def __init__(self, default_timeout: float = 30.0, max_retries: int = 3):
        self.default_timeout = default_timeout
        self.max_retries = max_retries

    async def execute_tool(self, tool: BaseTool, args: Dict[str, Any], timeout: float | None = None) -> Any:
        timeout = timeout or self.default_timeout
        attempt = 0
        
        while attempt < self.max_retries:
            try:
                # Wrap tool execution in an asyncio timeout
                # In a real environment, you might use a subprocess/docker sandbox for dangerous tools
                result = await asyncio.wait_for(self._run_tool_async(tool, args), timeout=timeout)
                return result
            except asyncio.TimeoutError:
                attempt += 1
                logger.warning(f"Tool {tool.name} timed out. Retry {attempt}/{self.max_retries}")
                if attempt >= self.max_retries:
                    return f"Error: Tool {tool.name} failed due to timeout."
            except Exception as e:
                logger.error(f"Error executing tool {tool.name}: {e}")
                return f"Error: {str(e)}"
                
    async def _run_tool_async(self, tool: BaseTool, args: Dict[str, Any]) -> Any:
        # Check if the tool has a native async implementation
        if getattr(tool, "coroutine", None):
            return await tool.ainvoke(args)
        else:
            # Run synchronous tool in an executor thread
            return await asyncio.to_thread(tool.invoke, args)

tool_executor = ToolExecutor()
