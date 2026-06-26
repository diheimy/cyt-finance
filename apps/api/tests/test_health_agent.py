from unittest.mock import patch

from src.schemas.health_report import HealthReport
from src.services.health import agent as agent_mod


def test_analyze_parses_structured_output():
    fake = HealthReport(
        score=80, nivel="saudavel", positivos=["ok"], atencao=[], recomendacoes=["manter"]
    )
    with patch.object(agent_mod, "_invoke_llm", return_value=fake):
        out = agent_mod.analyze(signals={"taxa_poupanca": 0.4}, rules=["reserva 3-6 meses"])
    assert isinstance(out, HealthReport)
    assert out.score == 80
    assert out.nivel == "saudavel"
