from fastapi import APIRouter, Depends, HTTPException

from src.deps import CurrentUser, current_user
from src.schemas.health_report import HealthAnalysisRequest, HealthReport
from src.services.health.report_service import generate_report, get_cached
from src.services.supabase_service import get_service_client, is_member

router = APIRouter(prefix="/health-analysis", tags=["health-analysis"])


@router.post("/{workspace_id}", response_model=HealthReport)
def create_analysis(
    workspace_id: str,
    req: HealthAnalysisRequest,
    user: CurrentUser = Depends(current_user),
) -> HealthReport:
    client = get_service_client()
    if not is_member(client, workspace_id, user.id):
        raise HTTPException(status_code=403, detail="not_a_member")
    return generate_report(client, workspace_id, req.mes)


@router.get("/{workspace_id}", response_model=HealthReport | None)
def read_analysis(
    workspace_id: str,
    mes: str,
    user: CurrentUser = Depends(current_user),
) -> HealthReport | None:
    client = get_service_client()
    if not is_member(client, workspace_id, user.id):
        raise HTTPException(status_code=403, detail="not_a_member")
    return get_cached(client, workspace_id, mes)
