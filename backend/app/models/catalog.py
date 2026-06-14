from __future__ import annotations

from pydantic import BaseModel, Field


class CatalogSummary(BaseModel):
    catalog_id: str
    name: str
    source: str
    source_url: str | None = None
    fetched_at_utc: str | None = None
    object_count: int
    snapshot: bool
    notes: str


class TleRecord(BaseModel):
    line1: str
    line2: str


class CatalogObject(BaseModel):
    object_id: str
    name: str
    norad_id: str | None = None
    owner: str | None = None
    object_type: str = Field(..., examples=["satellite", "debris"])
    orbit_class: str | None = None
    source_catalog: str | None = None
    tags: list[str] = Field(default_factory=list)
    tle: TleRecord | None = None


class CatalogSnapshot(BaseModel):
    catalog: CatalogSummary
    objects: list[CatalogObject]
    watchlists: dict[str, list[str]] = Field(default_factory=dict)


class CatalogListResponse(BaseModel):
    catalogs: list[CatalogSummary]


class CatalogDetailResponse(BaseModel):
    catalog: CatalogSummary
    objects: list[CatalogObject]
    watchlists: dict[str, list[str]] = Field(default_factory=dict)


class ObjectSearchResponse(BaseModel):
    query: str
    results: list[CatalogObject]


class WatchlistResponse(BaseModel):
    watchlist_id: str
    objects: list[CatalogObject]


class CatalogRefreshRequest(BaseModel):
    group: str = Field(default="active", min_length=1, max_length=48)
    limit: int = Field(default=120, ge=1, le=500)


class CatalogWorkbenchResponse(BaseModel):
    mode: str
    source: str
    source_url: str | None = None
    fetched_at_utc: str | None = None
    catalog: CatalogSummary
    objects: list[CatalogObject]
    total_count: int
    returned_count: int
    filters: dict[str, str | int | None]
    warnings: list[str] = Field(default_factory=list)
