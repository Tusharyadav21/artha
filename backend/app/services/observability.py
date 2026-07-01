import logging
from functools import wraps
from typing import Any, Callable

from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

def trace_node(node_name: str):
    """Decorator to trace a LangGraph node execution."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            with tracer.start_as_current_span(f"langgraph.node.{node_name}") as span:
                try:
                    result = func(*args, **kwargs)
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    logger.error(f"Node {node_name} failed: {e}")
                    raise e
        return wrapper
    return decorator

class ObservabilityManager:
    """Centralized metrics, tracing, and evaluation logging."""
    
    @staticmethod
    def log_token_usage(model: str, prompt_tokens: int, completion_tokens: int):
        """Log token usage to metrics backend (e.g. Prometheus/Datadog)."""
        # implementation for metrics backend
        total = prompt_tokens + completion_tokens
        logger.info(f"Model: {model} | Tokens: {total} (P: {prompt_tokens}, C: {completion_tokens})")

    @staticmethod
    def log_tool_execution(tool_name: str, latency_ms: float, success: bool):
        """Log tool execution metrics."""
        logger.info(f"Tool: {tool_name} | Latency: {latency_ms}ms | Success: {success}")

observability = ObservabilityManager()
