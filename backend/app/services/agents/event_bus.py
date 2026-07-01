import asyncio
import logging
from collections import defaultdict
from collections.abc import Callable
from typing import Any

from app.services.agents.interfaces import EventBus as EventBusABC

logger = logging.getLogger(__name__)


class InMemoryEventBus(EventBusABC):
    def __init__(self):
        self._subscribers: dict[str, list[Callable[..., Any]]] = defaultdict(list)
        self._seen: dict[str, set[int]] = defaultdict(set)

    def subscribe(self, event_type: str, callback: Callable[..., Any]) -> None:
        cb_id = id(callback)
        if cb_id not in self._seen[event_type]:
            self._subscribers[event_type].append(callback)
            self._seen[event_type].add(cb_id)

    async def publish(self, event_type: str, **kwargs: Any) -> None:
        if event_type not in self._subscribers:
            return

        for callback in self._subscribers[event_type]:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(**kwargs)
                else:
                    callback(**kwargs)
            except Exception as e:
                logger.error("Error executing callback for event %s: %s", event_type, e)


# Global event bus instance for the application
event_bus = InMemoryEventBus()
