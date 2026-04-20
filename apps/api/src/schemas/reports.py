from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class PdfReportRequest(BaseModel):
    workspace_id: UUID
    periodo_inicio: date
    periodo_fim: date
    incluir_auditoria: bool = False

    @model_validator(mode="after")
    def _validate_period(self) -> "PdfReportRequest":
        if self.periodo_fim < self.periodo_inicio:
            raise ValueError("periodo_fim_anterior_ao_inicio")
        if (self.periodo_fim - self.periodo_inicio).days > 366:
            raise ValueError("periodo_maior_que_1_ano")
        return self


class ReportSummary(BaseModel):
    entradas: float = Field(ge=0)
    saidas: float = Field(ge=0)
    resultado: float
    total_investimentos: float = Field(ge=0)
