from datetime import date
from typing import Any

from src.schemas.health_report import HealthReport
from src.services.health.aggregate import compute_signals
from src.services.health.agent import analyze
from src.services.health.retriever import retrieve_rules


def generate_report(client: Any, workspace_id: str, mes: str) -> HealthReport:
    txs = _fetch_month_txs(client, workspace_id, mes)
    investido, dividas, parcelas = _fetch_balances(client, workspace_id)
    signals = compute_signals(
        txs, investido=investido, dividas=dividas, parcelas_mensais=parcelas
    )
    query = (
        f"poupança {signals['taxa_poupanca']:.2f} "
        f"comprometimento com dívida {signals['comprometimento']:.2f} "
        f"patrimônio {signals['patrimonio']:.0f}"
    )
    rules = retrieve_rules(client, query)
    report = analyze(signals, rules)
    client.table("health_reports").upsert(
        {"workspace_id": workspace_id, "mes": mes, "payload": report.model_dump()},
        on_conflict="workspace_id,mes",
    ).execute()
    return report


def get_cached(client: Any, workspace_id: str, mes: str) -> HealthReport | None:
    res = (
        client.table("health_reports")
        .select("payload")
        .eq("workspace_id", workspace_id)
        .eq("mes", mes)
        .maybe_single()
        .execute()
    )
    if res and res.data:
        return HealthReport(**res.data["payload"])
    return None


def _fetch_month_txs(client: Any, workspace_id: str, mes: str) -> list[dict[str, Any]]:
    y, m = (int(p) for p in mes.split("-"))
    start = f"{mes}-01"
    next_month = date(y + m // 12, m % 12 + 1, 1).isoformat()  # 1º dia do mês seguinte
    res = (
        client.table("transactions")
        .select("tipo, valor, data")
        .eq("workspace_id", workspace_id)
        .gte("data", start)
        .lt("data", next_month)
        .execute()
    )
    return res.data or []


def _fetch_balances(client: Any, workspace_id: str) -> tuple[float, float, float]:
    inv = client.table("investments").select("valor").eq("workspace_id", workspace_id).execute()
    investido = sum(float(r["valor"]) for r in (inv.data or []))

    deb = (
        client.table("debts")
        .select("valor_total, parcelas_total, parcelas_pagas, quitada_em, tipo")
        .eq("workspace_id", workspace_id)
        .execute()
    )
    dividas = 0.0
    parcelas = 0.0
    for d in deb.data or []:
        if d.get("quitada_em") or d.get("tipo") != "pagar":
            continue
        total = float(d["valor_total"])
        n = int(d["parcelas_total"]) or 1
        pagas = int(d.get("parcelas_pagas") or 0)
        dividas += total - total * (pagas / n)
        parcelas += total / n
    return investido, dividas, parcelas
