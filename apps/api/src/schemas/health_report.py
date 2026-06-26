from typing import Literal

from pydantic import BaseModel


class HealthReport(BaseModel):
    # score de 0 a 100 — sem constraints min/max no schema porque a structured
    # output de alguns provedores (Anthropic via OpenRouter) rejeita maximum/minimum
    # em integer. O clamp é feito no serviço do agente.
    score: int
    nivel: Literal["saudavel", "atencao", "critico"]
    positivos: list[str]
    atencao: list[str]
    recomendacoes: list[str]


class HealthAnalysisRequest(BaseModel):
    workspace_id: str
    mes: str  # YYYY-MM
