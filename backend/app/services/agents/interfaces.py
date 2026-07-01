"""Abstract interfaces for agent platform components.

Purpose:
    Break tight coupling between chat routes, agent runtime, router, memory,
    and event bus. Each component now depends on an ABC rather than a concrete
    implementation, enabling:
    - Swappable implementations (e.g. Redis-backed vs in-memory event bus)
    - Easy mocking in tests
    - Horizontal scaling via distributed implementations

Usage:
    from app.services.agents.interfaces import AgentRouter, AgentRuntime, ...

Pattern:
    - Every abstract method matches the signature of the existing concrete
      implementation so adoption requires zero call-site changes.
    - Concrete classes raise NotImplementedError for optional methods they
      don't support (ISP — Interface Segregation).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator, Callable
from typing import Any
from uuid import UUID

# ---------------------------------------------------------------------------
# Agent Router
# ---------------------------------------------------------------------------


class AgentRouter(ABC):
    """Selects an agent based on a user query and workspace context."""

    @abstractmethod
    async def select_agent(self, query: str, workspace_id: UUID) -> Any | None:
        """Return the best-matching Agent for *query* in *workspace_id*.

        Returns ``None`` when no agent can handle the query (the caller
        should fall back to a default RAG pipeline).
        """
        ...


# ---------------------------------------------------------------------------
# Agent Runtime
# ---------------------------------------------------------------------------


class AgentRuntime(ABC):
    """Orchestrates execution of agent workflows (RAG, dynamic graphs, tools)."""

    @abstractmethod
    async def execute(
        self,
        user_input: str,
        conversation_id: UUID,
        workspace_id: UUID,
        project_id: UUID | None = None,
        trace_id: str | None = None,
        **kwargs: Any,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Stream execution updates as an async generator of dict chunks.

        Each yielded dict maps a node/step name → its output data. The
        caller merges chunks into a coherent response and emits events.
        """
        ...


# ---------------------------------------------------------------------------
# Memory Manager
# ---------------------------------------------------------------------------


class MemoryManager(ABC):
    """Manages short-term conversation memory and long-term agent memories."""

    @abstractmethod
    async def load_context(
        self,
        conversation_id: UUID,
        agent_id: UUID,
        workspace_id: UUID,
        limit: int = 50,
    ) -> dict:
        """Load conversation-scoped and agent-scoped memory context.

        Returns a dict with at least ``short_term`` and ``long_term`` keys.
        """
        ...

    @abstractmethod
    async def trigger_background_extraction(
        self,
        conversation_id: UUID,
        agent_id: UUID,
        workspace_id: UUID,
    ) -> None:
        """Signal the background worker to extract memories asynchronously."""
        ...


# ---------------------------------------------------------------------------
# Event Bus
# ---------------------------------------------------------------------------


class EventBus(ABC):
    """Pub/sub event bus for agent lifecycle events.

    Two implementations are provided:
    - ``InMemoryEventBus`` — local, single-process (default).
    - ``RedisEventBus`` — distributed, multi-process (horizontal scaling).
    """

    @abstractmethod
    def subscribe(self, event_type: str, callback: Callable[..., Any]) -> None:
        """Register *callback* to be invoked when *event_type* is published."""
        ...

    @abstractmethod
    async def publish(self, event_type: str, **kwargs: Any) -> None:
        """Notify all subscribers of *event_type* with the given payload."""
        ...
