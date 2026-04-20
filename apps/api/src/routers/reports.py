from fastapi import APIRouter, Depends, HTTPException, Response

from src.deps import CurrentUser, current_user
from src.schemas.reports import PdfReportRequest
from src.services.pdf_service import render_pdf
from src.services.supabase_service import fetch_report_data, get_service_client, is_member

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/pdf")
def generate_pdf(req: PdfReportRequest, user: CurrentUser = Depends(current_user)) -> Response:
    client = get_service_client()
    if not is_member(client, req.workspace_id, user.id):
        raise HTTPException(status_code=403, detail="not_a_member")

    data = fetch_report_data(
        client,
        workspace_id=req.workspace_id,
        periodo_inicio=req.periodo_inicio,
        periodo_fim=req.periodo_fim,
        incluir_auditoria=req.incluir_auditoria,
    )
    pdf_bytes = render_pdf(data)
    filename = f"cyt-finance-{req.periodo_inicio}-{req.periodo_fim}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
