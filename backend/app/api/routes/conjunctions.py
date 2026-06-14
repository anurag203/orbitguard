from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_conjunction_service
from app.models.conjunction import ConjunctionDetail, ScreeningRequest, ScreeningResponse
from app.services.conjunction_service import ConjunctionService

router = APIRouter()


@router.post("/conjunctions/screen", response_model=ScreeningResponse)
def screen_conjunctions(
    request: ScreeningRequest,
    service: ConjunctionService = Depends(get_conjunction_service),
) -> ScreeningResponse:
    return service.screen(request)


@router.get("/conjunctions/{conjunction_id}", response_model=ConjunctionDetail)
def get_conjunction(
    conjunction_id: str,
    service: ConjunctionService = Depends(get_conjunction_service),
) -> ConjunctionDetail:
    return service.get_detail(conjunction_id)
