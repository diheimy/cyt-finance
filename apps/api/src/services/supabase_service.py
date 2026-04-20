"""Cliente Supabase com service_role — usado para jobs (bypassa RLS).
Pode ser chamado apenas pelo código do servidor. NUNCA expor service_role ao front.
"""

from __future__ import annotations

from datetime import date
from functools import lru_cache
from typing import Any
from uuid import UUID

from supabase import Client, create_client

from src.config import settings


@lru_cache(maxsize=1)
def get_service_client() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidas"
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def is_member(client: Client, workspace_id: UUID, user_id: UUID) -> bool:
    """Checa se user_id pertence ao workspace (duplica guardrail de RLS no app-level)."""
    res = (
        client.table("workspace_members")
        .select("user_id", count="exact")
        .eq("workspace_id", str(workspace_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    return (res.count or 0) > 0


def fetch_report_data(
    client: Client,
    workspace_id: UUID,
    periodo_inicio: date,
    periodo_fim: date,
    incluir_auditoria: bool,
) -> dict[str, Any]:
    ws_id = str(workspace_id)
    start = periodo_inicio.isoformat()
    end = periodo_fim.isoformat()

    workspace = (
        client.table("workspaces").select("id, nome").eq("id", ws_id).single().execute().data
    )

    txs = (
        client.table("transactions")
        .select(
            "id, tipo, valor, descricao, data, paga, parcela_atual, parcelas_total, "
            "categoria:categories(nome, cor), cartao:cards(nome, ultimos_digitos)"
        )
        .eq("workspace_id", ws_id)
        .gte("data", start)
        .lte("data", end)
        .order("data")
        .execute()
        .data or []
    )

    invs = (
        client.table("investments")
        .select("descricao, categoria, valor, data")
        .eq("workspace_id", ws_id)
        .gte("data", start)
        .lte("data", end)
        .order("data")
        .execute()
        .data or []
    )

    audits: list[dict[str, Any]] = []
    if incluir_auditoria:
        audits = (
            client.table("audit_logs")
            .select("acao, entidade, created_at, user:profiles(nome)")
            .eq("workspace_id", ws_id)
            .gte("created_at", f"{start}T00:00:00Z")
            .lte("created_at", f"{end}T23:59:59Z")
            .order("created_at", desc=True)
            .limit(500)
            .execute()
            .data or []
        )

    entradas = sum(float(t["valor"]) for t in txs if t["paga"] and t["tipo"] == "entrada")
    saidas = sum(float(t["valor"]) for t in txs if t["paga"] and t["tipo"] == "gasto")
    total_inv = sum(float(i["valor"]) for i in invs)

    # Agrupa gastos pagos por categoria
    by_cat: dict[str, float] = {}
    cores: dict[str, str] = {}
    for t in txs:
        if not t["paga"] or t["tipo"] != "gasto":
            continue
        cat = (t.get("categoria") or {}).get("nome") or "Sem categoria"
        by_cat[cat] = by_cat.get(cat, 0.0) + float(t["valor"])
        cor = (t.get("categoria") or {}).get("cor")
        if cor:
            cores[cat] = cor
    categorias = sorted(
        ({"nome": k, "valor": v, "cor": cores.get(k, "#64748b")} for k, v in by_cat.items()),
        key=lambda c: c["valor"],
        reverse=True,
    )

    return {
        "workspace": workspace,
        "periodo_inicio": periodo_inicio,
        "periodo_fim": periodo_fim,
        "transacoes": txs,
        "investimentos": invs,
        "auditoria": audits,
        "summary": {
            "entradas": round(entradas, 2),
            "saidas": round(saidas, 2),
            "resultado": round(entradas - saidas, 2),
            "total_investimentos": round(total_inv, 2),
        },
        "categorias": categorias,
    }
