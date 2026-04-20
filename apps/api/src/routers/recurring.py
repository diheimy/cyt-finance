from fastapi import APIRouter, Depends

from src.deps import require_cron_secret
from src.schemas.recurring import RecurringTickResponse
from src.services.recurring_service import materialize_due
from src.services.supabase_service import get_service_client

router = APIRouter(prefix="/recurring", tags=["recurring"])


@router.post("/tick", response_model=RecurringTickResponse)
def tick(_: None = Depends(require_cron_secret)) -> RecurringTickResponse:
    """Endpoint disparado por scheduler externo (Fly.io cron, GH Actions, etc).
    Protegido por header X-Cron-Secret."""
    result = materialize_due(get_service_client())
    return RecurringTickResponse(**result)
