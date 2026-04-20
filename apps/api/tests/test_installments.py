"""
Testes da RPC `create_installments` — cobre casos de borda do dia de fechamento
e soma exata das parcelas (arredondamento).

Requer `supabase start` + migrations aplicadas + env vars (ver conftest.py).
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

import pytest

from .conftest import TestUser


# ─── Helper: cria cartão de teste ──────────────────────────────────────────

def _create_card(user: TestUser, workspace_id: str, dia_fechamento: int, nome: str = "Cartão Teste") -> str:
    res = (
        user.client.table("cards")
        .insert({
            "workspace_id": workspace_id,
            "nome": nome,
            "ultimos_digitos": "1234",
            "dia_fechamento": dia_fechamento,
        })
        .execute()
    )
    return res.data[0]["id"]


def _list_installments(user: TestUser, compra_id: str) -> list[dict[str, Any]]:
    res = (
        user.client.table("transactions")
        .select("*")
        .eq("compra_id", compra_id)
        .order("parcela_atual")
        .execute()
    )
    return list(res.data)


# ─── Cenário 1: compra ANTES do fechamento → 1ª parcela no mês seguinte ─────

def test_installment_before_closing_day_starts_next_month(user_a: TestUser, workspace_a: str) -> None:
    card_id = _create_card(user_a, workspace_a, dia_fechamento=10)

    # Compra em 2026-04-05 (antes do fechamento do dia 10) → 1ª parcela em maio
    compra_id = user_a.client.rpc("create_installments", {
        "p_workspace_id": workspace_a,
        "p_cartao_id": card_id,
        "p_valor_total": 600.00,
        "p_parcelas": 6,
        "p_descricao": "TV parcelada",
        "p_categoria_id": None,
        "p_data_compra": "2026-04-05",
    }).execute().data

    parcelas = _list_installments(user_a, compra_id)
    assert len(parcelas) == 6
    assert parcelas[0]["data"] == "2026-05-01"
    assert parcelas[5]["data"] == "2026-10-01"


# ─── Cenário 2: compra DEPOIS do fechamento → pula um mês adicional ─────────

def test_installment_after_closing_day_skips_month(user_a: TestUser, workspace_a: str) -> None:
    card_id = _create_card(user_a, workspace_a, dia_fechamento=5)

    # Compra em 2026-04-20 (depois do fechamento do dia 5) → 1ª parcela em junho
    compra_id = user_a.client.rpc("create_installments", {
        "p_workspace_id": workspace_a,
        "p_cartao_id": card_id,
        "p_valor_total": 300.00,
        "p_parcelas": 3,
        "p_descricao": "Fone",
        "p_categoria_id": None,
        "p_data_compra": "2026-04-20",
    }).execute().data

    parcelas = _list_installments(user_a, compra_id)
    assert len(parcelas) == 3
    assert parcelas[0]["data"] == "2026-06-01"
    assert parcelas[1]["data"] == "2026-07-01"
    assert parcelas[2]["data"] == "2026-08-01"


# ─── Cenário 3: soma das parcelas == valor total (arredondamento) ───────────

def test_installment_sum_equals_total_with_rounding(user_a: TestUser, workspace_a: str) -> None:
    card_id = _create_card(user_a, workspace_a, dia_fechamento=10)

    # 100 / 3 = 33,333... → precisa ajustar última parcela
    compra_id = user_a.client.rpc("create_installments", {
        "p_workspace_id": workspace_a,
        "p_cartao_id": card_id,
        "p_valor_total": 100.00,
        "p_parcelas": 3,
        "p_descricao": "Teste arredondamento",
        "p_categoria_id": None,
        "p_data_compra": "2026-04-05",
    }).execute().data

    parcelas = _list_installments(user_a, compra_id)
    soma = sum(Decimal(str(p["valor"])) for p in parcelas)
    assert soma == Decimal("100.00")
    # Primeiras iguais, última ajustada
    assert Decimal(str(parcelas[0]["valor"])) == Decimal("33.33")
    assert Decimal(str(parcelas[1]["valor"])) == Decimal("33.33")
    assert Decimal(str(parcelas[2]["valor"])) == Decimal("33.34")


# ─── Cenário 4: todas as parcelas começam como não pagas ────────────────────

def test_installments_start_as_unpaid(user_a: TestUser, workspace_a: str) -> None:
    card_id = _create_card(user_a, workspace_a, dia_fechamento=15)

    compra_id = user_a.client.rpc("create_installments", {
        "p_workspace_id": workspace_a,
        "p_cartao_id": card_id,
        "p_valor_total": 200.00,
        "p_parcelas": 2,
        "p_descricao": "Teste paga=false",
        "p_categoria_id": None,
        "p_data_compra": "2026-04-05",
    }).execute().data

    parcelas = _list_installments(user_a, compra_id)
    assert all(p["paga"] is False for p in parcelas)
    assert all(p["cartao_id"] == card_id for p in parcelas)


# ─── Cenário 5: RPC rejeita chamada de não-editor ───────────────────────────

def test_installment_rpc_rejects_non_editor(
    user_a: TestUser, user_b: TestUser, workspace_a: str
) -> None:
    card_id = _create_card(user_a, workspace_a, dia_fechamento=10)

    with pytest.raises(Exception):
        user_b.client.rpc("create_installments", {
            "p_workspace_id": workspace_a,
            "p_cartao_id": card_id,
            "p_valor_total": 100.00,
            "p_parcelas": 2,
            "p_descricao": "Fraude",
            "p_categoria_id": None,
            "p_data_compra": "2026-04-05",
        }).execute()


# ─── Cenário 6: RPC rejeita cartão de outro workspace ───────────────────────

def test_installment_rpc_rejects_cross_workspace_card(
    user_a: TestUser, workspace_a: str
) -> None:
    # Cria outro workspace pertencente a user_a
    ws_b = (
        user_a.client.table("workspaces")
        .insert({"nome": "Outro WS", "owner_id": user_a.user_id})
        .execute()
    ).data[0]["id"]

    card_in_ws_b = _create_card(user_a, ws_b, dia_fechamento=10, nome="Cartão WS-B")

    # Tentar usar cartão do ws_b para parcelar em ws_a
    with pytest.raises(Exception):
        user_a.client.rpc("create_installments", {
            "p_workspace_id": workspace_a,
            "p_cartao_id": card_in_ws_b,
            "p_valor_total": 100.00,
            "p_parcelas": 2,
            "p_descricao": "Cross-ws",
            "p_categoria_id": None,
            "p_data_compra": "2026-04-05",
        }).execute()


# ─── Cenário 7: edge case — compra exatamente no dia de fechamento ──────────

def test_installment_on_exact_closing_day_goes_next_month(
    user_a: TestUser, workspace_a: str
) -> None:
    card_id = _create_card(user_a, workspace_a, dia_fechamento=10)

    # Compra em 2026-04-10 (EXATAMENTE no fechamento) — SQL usa <= então cai em maio
    compra_id = user_a.client.rpc("create_installments", {
        "p_workspace_id": workspace_a,
        "p_cartao_id": card_id,
        "p_valor_total": 100.00,
        "p_parcelas": 2,
        "p_descricao": "Exato no fechamento",
        "p_categoria_id": None,
        "p_data_compra": "2026-04-10",
    }).execute().data

    parcelas = _list_installments(user_a, compra_id)
    assert parcelas[0]["data"] == "2026-05-01"
    assert parcelas[1]["data"] == "2026-06-01"
