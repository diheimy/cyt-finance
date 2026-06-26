from typing import Literal

from pydantic import BaseModel, Field


class HealthReport(BaseModel):
    score: int = Field(ge=0, le=100)
    nivel: Literal["saudavel", "atencao", "critico"]
    positivos: list[str]
    atencao: list[str]
    recomendacoes: list[str]


class HealthAnalysisRequest(BaseModel):
    workspace_id: str
    mes: str  # YYYY-MM
