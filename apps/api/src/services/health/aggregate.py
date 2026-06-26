from collections.abc import Iterable
from typing import Any


def compute_signals(
    txs: Iterable[dict[str, Any]],
    *,
    investido: float,
    dividas: float,
    parcelas_mensais: float,
) -> dict[str, float]:
    """Calcula os indicadores financeiros do mês a partir das transações + saldos.

    `txs`: dicts com ao menos `tipo` ('entrada'|'gasto') e `valor`.
    """
    txs = list(txs)
    entradas = sum(float(t["valor"]) for t in txs if t["tipo"] == "entrada")
    saidas = sum(float(t["valor"]) for t in txs if t["tipo"] == "gasto")
    taxa_poupanca = (entradas - saidas) / entradas if entradas > 0 else 0.0
    comprometimento = parcelas_mensais / entradas if entradas > 0 else 0.0
    return {
        "entradas": entradas,
        "saidas": saidas,
        "resultado": entradas - saidas,
        "taxa_poupanca": taxa_poupanca,
        "comprometimento": comprometimento,
        "patrimonio": investido - dividas,
        "investido": investido,
        "dividas": dividas,
        "parcelas_mensais": parcelas_mensais,
    }
