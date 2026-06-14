from __future__ import annotations

import logging
from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logger = logging.getLogger("orbitguard.errors")


class ApiError(BaseModel):
    code: str = Field(..., examples=["not_found"])
    message: str
    details: dict[str, Any] | None = None


class OrbitGuardError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


async def orbitguard_error_handler(_: Request, exc: OrbitGuardError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": ApiError(code=exc.code, message=exc.message, details=exc.details).model_dump()},
    )


async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": ApiError(
                code="validation_error",
                message="Request validation failed.",
                details={"errors": exc.errors()},
            ).model_dump()
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    # Log the REAL exception (with traceback) server-side; never leak it to the client.
    logger.exception(
        "unhandled_exception method=%s path=%s request_id=%s",
        request.method,
        request.url.path,
        request_id,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": ApiError(
                code="internal_error",
                message="An unexpected internal error occurred.",
                details={"request_id": request_id} if request_id else None,
            ).model_dump()
        },
    )
