from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import catalogs, conjunctions, demo, health, maneuvers, propagation, reports, scenarios

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(catalogs.router, tags=["catalogs"])
api_router.include_router(propagation.router, tags=["propagation"])
api_router.include_router(conjunctions.router, tags=["conjunctions"])
api_router.include_router(scenarios.router, tags=["scenarios"])
api_router.include_router(maneuvers.router, tags=["maneuvers"])
api_router.include_router(reports.router, tags=["reports"])
api_router.include_router(demo.router, tags=["demo"])
