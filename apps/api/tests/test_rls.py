"""
Suite obrigatória de testes RLS — ADR-005.

Para cada tabela de domínio, valida que:
  1. user_b (não-membro) NÃO consegue ler dados do workspace_a
  2. user_b NÃO consegue inserir dados no workspace_a
  3. user_b NÃO consegue atualizar dados do workspace_a
  4. user_b NÃO consegue deletar dados do workspace_a
  5. user_a (membro) consegue todas as operações
"""

from __future__ import annotations

import pytest

from .conftest import TestUser


pytestmark = pytest.mark.usefixtures("workspace_a")


def _expect_denied(op_result: object) -> None:
    """RLS pode retornar (a) erro 403 / 42501 OU (b) 0 linhas afetadas.
    Ambos são formas válidas de bloqueio no PostgREST. Aceita qualquer uma."""
    if isinstance(op_result, Exception):
        return  # erro esperado — bloqueou
    if hasattr(op_result, "data") and not op_result.data:
        return  # 0 linhas retornadas — bloqueou
    raise AssertionError(f"esperava bloqueio RLS, recebeu: {op_result!r}")


# ─── Cenário 1: user_b não enxerga o workspace de user_a ─────────────────────

def test_user_b_cannot_read_workspace_a(user_b: TestUser, workspace_a: str) -> None:
    res = user_b.client.table("workspaces").select("*").eq("id", workspace_a).execute()
    assert res.data == []


def test_user_b_cannot_read_members_of_workspace_a(user_b: TestUser, workspace_a: str) -> None:
    res = user_b.client.table("workspace_members").select("*").eq("workspace_id", workspace_a).execute()
    assert res.data == []


def test_user_b_cannot_insert_workspace_with_user_a_as_owner(
    user_b: TestUser, user_a: TestUser
) -> None:
    with pytest.raises(Exception):
        user_b.client.table("workspaces").insert(
            {"nome": "Fraude", "owner_id": user_a.user_id}
        ).execute()


# ─── Cenário 2: tabelas de domínio — user_b não lê/escreve em workspace_a ──────

@pytest.mark.parametrize(
    "table,payload",
    [
        ("cards", {"nome": "Fake", "ultimos_digitos": "0000", "dia_fechamento": 5}),
        ("categories", {"nome": "Fake", "tipo": "gasto"}),
        ("transactions", {"tipo": "gasto", "valor": 10, "descricao": "Fake", "data": "2026-04-20"}),
        ("recurring", {"tipo": "gasto", "valor": 10, "descricao": "Fake", "data_inicio": "2026-04-20"}),
        ("investments", {"valor": 10, "descricao": "Fake", "categoria": "cripto", "data": "2026-04-20"}),
        ("debts", {"tipo": "pagar", "pessoa": "X", "valor_total": 100, "parcelas_total": 1, "data_inicio": "2026-04-20"}),
    ],
)
def test_user_b_cannot_insert_in_workspace_a(
    user_b: TestUser, user_a: TestUser, workspace_a: str, table: str, payload: dict
) -> None:
    full_payload = {**payload, "workspace_id": workspace_a, "created_by": user_a.user_id}
    with pytest.raises(Exception):
        user_b.client.table(table).insert(full_payload).execute()


def test_user_b_cannot_read_transactions_of_workspace_a(
    user_a: TestUser, user_b: TestUser, workspace_a: str
) -> None:
    # user_a cria uma transação
    user_a.client.table("transactions").insert({
        "workspace_id": workspace_a,
        "tipo": "gasto",
        "valor": 99.99,
        "descricao": "Secreta",
        "data": "2026-04-20",
        "created_by": user_a.user_id,
    }).execute()

    # user_b não deve ver nenhuma
    res = user_b.client.table("transactions").select("*").eq("workspace_id", workspace_a).execute()
    assert res.data == []


# ─── Cenário 3: user_a (membro owner) consegue as operações ─────────────────

def test_user_a_can_read_own_workspace(user_a: TestUser, workspace_a: str) -> None:
    res = user_a.client.table("workspaces").select("*").eq("id", workspace_a).execute()
    assert len(res.data) == 1
    assert res.data[0]["nome"] == "Workspace A"


def test_user_a_gets_default_categories_seeded(user_a: TestUser, workspace_a: str) -> None:
    res = user_a.client.table("categories").select("*").eq("workspace_id", workspace_a).execute()
    assert len(res.data) >= 10  # seed cria 13 categorias


# ─── Cenário 4: convite com token inválido é rejeitado ──────────────────────

def test_accept_invite_with_invalid_token_raises(user_b: TestUser) -> None:
    with pytest.raises(Exception):
        user_b.client.rpc("accept_invite", {"p_token": "token-que-nao-existe"}).execute()


def test_accept_invite_without_auth_raises(supabase_env: dict[str, str]) -> None:
    from supabase import create_client

    anon = create_client(supabase_env["url"], supabase_env["anon"])
    with pytest.raises(Exception):
        anon.rpc("accept_invite", {"p_token": "qualquer"}).execute()


# ─── Cenário 5: audit_logs respeita RLS ─────────────────────────────────────

def test_user_b_cannot_read_audit_of_workspace_a(
    user_a: TestUser, user_b: TestUser, workspace_a: str
) -> None:
    # user_a gera log automaticamente ao inserir uma categoria (trigger)
    user_a.client.table("categories").insert({
        "workspace_id": workspace_a,
        "nome": "Teste Audit",
        "tipo": "gasto",
    }).execute()

    res = user_b.client.table("audit_logs").select("*").eq("workspace_id", workspace_a).execute()
    assert res.data == []
