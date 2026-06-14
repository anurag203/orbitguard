from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_catalog_service
from app.models.catalog import (
    CatalogDetailResponse,
    CatalogListResponse,
    CatalogRefreshRequest,
    CatalogWorkbenchResponse,
    ObjectSearchResponse,
    WatchlistResponse,
)
from app.services.catalog_service import CatalogService

router = APIRouter()


@router.get("/catalogs", response_model=CatalogListResponse)
def list_catalogs(service: CatalogService = Depends(get_catalog_service)) -> CatalogListResponse:
    return service.list_catalogs()


@router.get("/catalogs/full", response_model=CatalogWorkbenchResponse)
def full_catalog(
    source: str = Query(default="fixture", description="fixture or live"),
    q: str = Query(default="", description="Name, NORAD ID, owner, source, orbit class, or tag search."),
    owner: str = Query(default="", description="Owner substring filter."),
    object_type: str = Query(default="", description="Object type filter."),
    orbit_class: str = Query(default="", description="Orbit class filter."),
    group: str = Query(default="active", description="CelesTrak group for live mode."),
    limit: int = Query(default=80, ge=1, le=500),
    service: CatalogService = Depends(get_catalog_service),
) -> CatalogWorkbenchResponse:
    return service.full_catalog(
        source=source,
        query=q,
        owner=owner,
        object_type=object_type,
        orbit_class=orbit_class,
        group=group,
        limit=limit,
    )


@router.post("/catalogs/live/refresh", response_model=CatalogWorkbenchResponse)
def refresh_live_catalog(
    request: CatalogRefreshRequest,
    service: CatalogService = Depends(get_catalog_service),
) -> CatalogWorkbenchResponse:
    return service.refresh_live_catalog(group=request.group, limit=request.limit)


@router.get("/catalogs/{catalog_id}", response_model=CatalogDetailResponse)
def load_catalog(
    catalog_id: str,
    service: CatalogService = Depends(get_catalog_service),
) -> CatalogDetailResponse:
    return service.load_catalog(catalog_id)


@router.get("/objects/search", response_model=ObjectSearchResponse)
def search_objects(
    q: str = Query(default="", description="Name, NORAD ID, or tag search."),
    service: CatalogService = Depends(get_catalog_service),
) -> ObjectSearchResponse:
    return service.search_objects(q)


@router.get("/watchlists/{watchlist_id}", response_model=WatchlistResponse)
def get_watchlist(
    watchlist_id: str,
    service: CatalogService = Depends(get_catalog_service),
) -> WatchlistResponse:
    return service.get_watchlist(watchlist_id)
