from typing import Any

from langchain_openai import ChatOpenAI

from src.config import settings
from src.schemas.health_report import HealthReport

_SYSTEM = (
    "Você é um analista de saúde financeira pessoal. Receba os indicadores do usuário "
    "e regras de educação financeira recuperadas. Produza um diagnóstico em português, "
    "objetivo, com pontos positivos, pontos de atenção e recomendações acionáveis. "
    "O score vai de 0 (crítico) a 100 (excelente)."
)


def _invoke_llm(signals: dict[str, Any], rules: list[str]) -> HealthReport:
    llm = ChatOpenAI(
        model=settings.health_model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=0.2,
    ).with_structured_output(HealthReport)
    prompt = (
        f"{_SYSTEM}\n\nIndicadores do mês:\n{signals}\n\n"
        "Regras de educação financeira recuperadas:\n"
        + "\n".join(f"- {r}" for r in rules)
    )
    return llm.invoke(prompt)  # type: ignore[return-value]


def analyze(signals: dict[str, Any], rules: list[str]) -> HealthReport:
    report = _invoke_llm(signals, rules)
    report.score = max(0, min(100, report.score))
    return report
