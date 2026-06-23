"""
Request/Response Logging Middleware
====================================
Logs all incoming requests and outgoing responses for observability.
"""

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from backend.utils.logger import get_logger

logger = get_logger("middleware.logging")


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs request/response details.
    Adds a unique request ID for traceability.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        # Log incoming request
        logger.info(
            f"[{request_id}] → {request.method} {request.url.path} "
            f"(client: {request.client.host if request.client else 'unknown'})"
        )

        # Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(f"[{request_id}] ✗ Exception: {exc}")
            raise

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log response
        logger.info(
            f"[{request_id}] ← {response.status_code} "
            f"({duration_ms:.1f}ms)"
        )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        return response
