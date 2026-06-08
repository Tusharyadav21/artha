import uuid
from collections.abc import Awaitable, Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger(__name__)


class RequestTracingMiddleware(BaseHTTPMiddleware):
    """
    Purpose:
        Provides request-scoped tracing by injecting unique request IDs.

    Responsibilities:
        - Assign a unique X-Request-ID to every incoming request.
        - Bind the request ID and metadata to the structlog context.
        - Ensure request ID is returned in the response headers.
        - Clear the context after the request is processed.

    Dependencies:
        - structlog
        - starlette.middleware.base.BaseHTTPMiddleware

    Flow:
        1. Extract X-Request-ID from headers or generate a new UUID.
        2. Bind request_id, method, path, and client_host to structlog context.
        3. Pass the request to the next handler.
        4. Add the request_id to the final response headers.
        5. Clear context variables in the finally block.
    """
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """
        Purpose:
            Intercepts requests to apply tracing logic.

        Args:
            request (Request):
                The incoming HTTP request.

            call_next (Callable[[Request], Awaitable[Response]]):
            The next handler in the middleware chain.

        Returns:
            Response:
                The response from the inner handler, decorated with tracing headers.
        """
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        structlog.contextvars.bind_contextvars(request_id=request_id)

        # Optionally bind other useful request info
        structlog.contextvars.bind_contextvars(
            method=request.method,
            path=request.url.path,
            client_host=request.client.host if request.client else None,
        )

        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            structlog.contextvars.clear_contextvars()
