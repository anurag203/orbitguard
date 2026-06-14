from __future__ import annotations

import logging
import time
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("orbitguard.request")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach a request id to every request and log a one-line access record.

    The request id is echoed back in the `x-request-id` header and stored on
    `request.state` so the global exception handler can correlate a friendly
    error response with the server-side log line.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or uuid4().hex
        request.state.request_id = request_id
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
        logger.info(
            "request method=%s path=%s status=%s ms=%s request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            request_id,
        )
        response.headers["x-request-id"] = request_id
        return response
