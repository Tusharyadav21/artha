import asyncio
import inspect
import logging
from collections.abc import Callable
from typing import Any

logger = logging.getLogger(__name__)


class ToolExecutor:
    def __init__(self):
        self._registered_tools: dict[str, Callable[..., Any]] = {}

    def register_tool(self, name: str, func: Callable[..., Any]) -> None:
        self._registered_tools[name] = func

    async def execute(self, tool_name: str, parameters: dict[str, Any]) -> Any:
        logger.info("Executing tool %s with params %s", tool_name, parameters)
        if tool_name not in self._registered_tools:
            raise ValueError(f"Tool {tool_name} not found or not supported yet.")

        func = self._registered_tools[tool_name]
        try:
            if inspect.iscoroutinefunction(func):
                return await func(**parameters)
            else:
                return await asyncio.to_thread(func, **parameters)
        except Exception as e:
            logger.error("Error executing tool %s: %s", tool_name, e)
            raise


# Global tool executor instance
tool_executor = ToolExecutor()
