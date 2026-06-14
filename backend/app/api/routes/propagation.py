from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_propagation_service
from app.models.propagation import PropagationRequest, PropagationResponse
from app.services.propagation_service import PropagationService

router = APIRouter()


@router.post("/propagate", response_model=PropagationResponse)
def propagate(
    request: PropagationRequest,
    service: PropagationService = Depends(get_propagation_service),
) -> PropagationResponse:
    return service.propagate(request)
