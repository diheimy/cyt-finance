from src.services.health.aggregate import compute_signals


def test_compute_signals_basic():
    txs = [
        {"tipo": "entrada", "valor": 5000, "data": "2026-06-05"},
        {"tipo": "gasto", "valor": 3000, "data": "2026-06-10"},
    ]
    s = compute_signals(txs, investido=10000, dividas=2000, parcelas_mensais=500)
    assert s["entradas"] == 5000
    assert s["saidas"] == 3000
    assert round(s["taxa_poupanca"], 2) == 0.40
    assert round(s["comprometimento"], 2) == 0.10
    assert s["patrimonio"] == 8000


def test_compute_signals_no_income():
    s = compute_signals(
        [{"tipo": "gasto", "valor": 100}], investido=0, dividas=0, parcelas_mensais=0
    )
    assert s["taxa_poupanca"] == 0.0
    assert s["comprometimento"] == 0.0
