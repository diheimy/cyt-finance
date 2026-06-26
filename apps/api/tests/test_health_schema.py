from src.schemas.health_report import HealthReport


def test_health_report_valid():
    r = HealthReport(
        score=72,
        nivel="atencao",
        positivos=["Boa taxa de poupança"],
        atencao=["Cartão acima de 50%"],
        recomendacoes=["Reduzir uso do cartão"],
    )
    assert r.score == 72
    assert r.nivel == "atencao"
