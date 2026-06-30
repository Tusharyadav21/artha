"""Redis-backed EventBus for distributed (multi-process) event publishing.

Extends the in-process EventBus with Redis pub/sub so events published
by one API process reach subscribers in another — enabling horizontal
scaling across multiple workers/containers.

Usage:
    from app.services.agents.redis_event_bus import RedisEventBus

    event_bus = RedisEventBus()
    event_bus.subscribe("StepCompleted", my_handler)
    await event_bus.publish("StepCompleted", node_name="retrieve", ...)
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from collections.abc import Callable
from typing import Any

from app.services.agents.interfaces import EventBus
from app.utils.redis_client import get_redis

logger = logging.getLogger(__name__)

_REDIS_CHANNEL_TPL = "artha:events:{event_type}"


class RedisEventBus(EventBus):
    """Event bus that publishes to both local subscribers and Redis pub/sub.

    Local subscribers are notified in-process. The Redis publish call is
    fire-and-forget (errors are logged, never raised). If Redis is
    unreachable the bus degrades gracefully to in-process only.
    """

    def __init__(self) -> None:
        self._subscribers: dict[str, list[Callable[..., Any]]] = defaultdict(list)
        self._seen: dict[str, set[int]] = defaultdict(set)

    def subscribe(self, event_type: str, callback: Callable[..., Any]) -> None:
        """Register *callback* for local delivery when *event_type* fires."""
        cb_id = id(callback)
        if cb_id not in self._seen[event_type]:
            self._subscribers[event_type].append(callback)
            self._seen[event_type].add(cb_id)

    async def publish(self, event_type: str, **kwargs: Any) -> None:
        """Deliver *event_type* to local subscribers + Redis pub/sub channel."""
        # 1. Local (in-process) delivery — same as InMemoryEventBus
        if event_type in self._subscribers:
            for callback in self._subscribers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(**kwargs)
                    else:
                        callback(**kwargs)
                except Exception as exc:
                    logger.error(
                        "Local event callback error for %s: %s", event_type, exc
                    )

        # 2. Distributed delivery via Redis pub/sub — best-effort
        try:
            redis = get_redis()
            payload = json.dumps(kwargs, default=str)
            channel = _REDIS_CHANNEL_TPL.format(event_type=event_type)
            await redis.publish(channel, payload)
        except Exception as exc:
            logger.warning(
                "Redis publish failed for %s (event still delivered locally): %s",
                event_type,
                exc,
            )
