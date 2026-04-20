"""Materializa regras recorrentes vencidas como transações.

Idempotência: para cada regra, verifica se já existe transação com
(recurring_id=rule.id AND data=hoje). Se existir, pula.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Protocol

import structlog

logger = structlog.get_logger(__name__)


class SupabaseLike(Protocol):
    def table(self, name: str) -> Any: ...


def materialize_due(client: SupabaseLike, today: date | None = None) -> dict[str, Any]:
    """Materializa todas as regras recorrentes ativas cuja data do dia corrente
    seja >= data_inicio e que ainda não foram materializadas hoje.

    Retorna contadores + lista de erros.
    """
    today = today or date.today()
    today_iso = today.isoformat()
    materialized = 0
    skipped = 0
    errors: list[str] = []

    rules = (
        client.table("recurring")
        .select("*")
        .eq("ativo", True)
        .lte("data_inicio", today_iso)
        .execute()
    ).data or []

    for rule in rules:
        try:
            rule_id = rule["id"]

            # Idempotência: já materializada hoje?
            already = (
                client.table("transactions")
                .select("id", count="exact")
                .eq("recurring_id", rule_id)
                .eq("data", today_iso)
                .execute()
            )
            if (already.count or 0) > 0:
                skipped += 1
                continue

            limite = int(rule["limite_parcelas"])
            ja_feitas = int(rule["parcelas_materializadas"])
            if limite > 0 and ja_feitas >= limite:
                skipped += 1
                continue

            client.table("transactions").insert({
                "workspace_id": rule["workspace_id"],
                "tipo": rule["tipo"],
                "valor": rule["valor"],
                "descricao": rule["descricao"],
                "data": today_iso,
                "categoria_id": rule.get("categoria_id"),
                "recurring_id": rule_id,
                "paga": True,
                "parcela_atual": 1,
                "parcelas_total": 1,
                "created_by": rule["created_by"],
            }).execute()

            client.table("recurring").update({
                "parcelas_materializadas": ja_feitas + 1
            }).eq("id", rule_id).execute()

            materialized += 1
            logger.info("recurring_materialized", rule_id=rule_id, data=today_iso)
        except Exception as e:  # noqa: BLE001 — queremos seguir com as outras regras
            msg = f"rule={rule.get('id', '?')}: {type(e).__name__}: {e}"
            errors.append(msg)
            logger.error("recurring_error", error=msg)

    return {
        "materialized_count": materialized,
        "skipped_count": skipped,
        "errors": errors,
        "ran_at": today_iso,
    }
