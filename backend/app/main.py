from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.errors import (
    OrbitGuardError,
    orbitguard_error_handler,
    unhandled_exception_handler,
    validation_error_handler,
)
from app.core.logging_config import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.dependencies import build_container


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.container = build_container()
    logging.getLogger("orbitguard").info(
        "startup.complete environment=%s version=%s",
        settings.environment,
        settings.version,
    )
    yield
    logging.getLogger("orbitguard").info("shutdown.complete")


def create_app() -> FastAPI:
    configure_logging(level=settings.log_level, json_logs=settings.json_logs)

    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="OrbitGuard mission-control backend API.",
        lifespan=lifespan,
    )

    # Build the container eagerly too, so app.state.container is available even when
    # the lifespan is not triggered (e.g. tests that construct a TestClient without
    # entering its context manager).
    app.state.container = build_container()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestContextMiddleware)

    app.add_exception_handler(OrbitGuardError, orbitguard_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
