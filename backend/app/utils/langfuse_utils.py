"""Safe helpers for Langfuse trace/span/generation lifecycle.

All functions are None-safe and exception-safe — they log at DEBUG on failure
so the calling code never crashes when Langfuse is down or misconfigured.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def safe_span(trace: Any, name: str, **kwargs: Any) -> Any:
    """Create a trace span, returning None on failure."""
    if trace is None:
        return None
    try:
        return trace.span(name=name, **kwargs)
    except Exception as exc:
        logger.debug("Langfuse safe_span('%s') failed: %s", name, exc)
        return None


def safe_generation(trace: Any, name: str, **kwargs: Any) -> Any:
    """Create a trace generation, returning None on failure."""
    if trace is None:
        return None
    try:
        return trace.generation(name=name, **kwargs)
    except Exception as exc:
        logger.debug("Langfuse safe_generation('%s') failed: %s", name, exc)
        return None


def safe_end(span: Any, **kwargs: Any) -> None:
    """End a span/generation, logging on failure."""
    if span is None:
        return
    try:
        span.end(**kwargs)
    except Exception as exc:
        logger.debug("Langfuse safe_end failed: %s", exc)


def safe_trace_update(trace: Any, langfuse_client: Any, **kwargs: Any) -> None:
    """Update a trace and flush the client, logging on failure."""
    if trace is None:
        return
    try:
        trace.update(**kwargs)
    except Exception as exc:
        logger.debug("Langfuse safe_trace_update failed: %s", exc)
    if langfuse_client:
        try:
            langfuse_client.flush()
        except Exception as exc:
            logger.debug("Langfuse flush failed: %s", exc)
